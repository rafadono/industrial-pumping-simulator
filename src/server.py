from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from src.pump_model import Fluid, Pipe, PumpingSystem
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI(title="Unified Hydraulic Simulation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PipeSchema(BaseModel):
    inner_diameter: float
    length: float
    roughness: float
    total_k: float

class SimulationPayload(BaseModel):
    mode: str
    cp: float
    solid_sg: float
    direct_density: float
    viscosity: float
    vapor_pressure: float
    froth_factor: float
    flow_rate_m3h: float
    static_head: float
    differential_pressure: float
    differential_pressure_final: float
    suction_lift: float
    atmospheric_pressure: float
    pump_efficiency: float
    motor_efficiency: float
    er_cave: float
    safety_factor: float
    hr_cave: float
    fl_durand: float
    celerity: float
    closure_time: float
    pipe_material: str
    friction_formula: str = ""
    durand_formula: str = ""
    viscosity_formula: str = ""
    celerity_formula: str = ""
    cave_formula: str = ""
    pump_curve_type: str = "none"
    pump_shutoff: float = 0.0
    pump_q_bep: float = 0.0
    pump_h_bep: float = 0.0
    pump_q_max: float = 0.0
    pump_h_max: float = 0.0
    pump_coef_a: float = 0.0
    pump_coef_b: float = 0.0
    pump_coef_c: float = 0.0
    suction: PipeSchema
    discharge: PipeSchema

@app.post("/api/calculate")
def calculate_pumping_system(req: SimulationPayload):
    try:
        if req.mode == "concentracion":
            fluid = Fluid.from_concentration(
                req.cp, req.solid_sg, req.viscosity, req.vapor_pressure, req.froth_factor
            )
        else:
            fluid = Fluid(
                req.direct_density,
                req.viscosity,
                req.vapor_pressure,
                req.direct_density > 1000.1,
                req.froth_factor,
                req.solid_sg,
            )

        pipe_suc = Pipe(
            req.suction.inner_diameter,
            req.suction.length,
            req.suction.roughness,
            req.suction.total_k,
        )
        pipe_des = Pipe(
            req.discharge.inner_diameter,
            req.discharge.length,
            req.discharge.roughness,
            req.discharge.total_k,
        )

        system = PumpingSystem(
            fluid,
            pipe_suc,
            pipe_des,
            req.static_head,
            req.suction_lift,
            req.atmospheric_pressure,
        )

        effective_viscosity = fluid.calculate_dynamic_viscosity(
            req.cp, req.solid_sg, req.viscosity_formula
        )
        real_celerity = system.calculate_dynamic_celerity(
            req.celerity, req.pipe_material, req.celerity_formula
        )
        cave_factors = system.evaluate_cave_factors(
            req.hr_cave, req.er_cave, req.cp, req.cave_formula
        )

        q_m3s = req.flow_rate_m3h / 3600.0
        tdh_wcl = system.calculate_tdh(
            q_m3s, req.differential_pressure, req.friction_formula, effective_viscosity
        )
        tdh_wcm = tdh_wcl * fluid.mixture_sg
        npsha = system.calculate_npsha(
            q_m3s, req.friction_formula, effective_viscosity
        )
        
        power = system.calculate_motor_power(
            q_m3s,
            tdh_wcl,
            req.pump_efficiency,
            req.motor_efficiency,
            cave_factors["ER"],
            req.safety_factor,
        )
        cave = system.calculate_selection_head_cave(tdh_wcl, cave_factors["HR"])
        durand = system.durand_critical_velocity(req.fl_durand, req.durand_formula)
        water_hammer = system.check_water_hammer(q_m3s, real_celerity, req.closure_time)
        
        submergence = system.calculate_critical_submergence(q_m3s)
        rec_diameter = system.recommend_line_diameter(q_m3s)

        A, B, C = 0.0, 0.0, 0.0
        pump_points = []
        intersection_ini = {"Q_m3h": 0.0, "H_mcl": 0.0}
        intersection_fin = {"Q_m3h": 0.0, "H_mcl": 0.0}
        flow_sweep = [0, 50, 100, 150, 200, 250, 300, 350, 400, 450]
        
        if req.pump_curve_type != "none":
            if req.pump_curve_type == "3puntos":
                q1 = req.pump_q_bep / 3600.0
                q2 = req.pump_q_max / 3600.0
                C = req.pump_shutoff
                if q1 > 0 and q2 > 0 and q1 != q2:
                    A = (
                        ((req.pump_h_max - C) / q2 - (req.pump_h_bep - C) / q1)
                        / (q2 - q1)
                    )
                    B = (req.pump_h_bep - C - A * (q1**2)) / q1
            else:
                A, B, C = req.pump_coef_a, req.pump_coef_b, req.pump_coef_c
            
            for q_h in flow_sweep:
                q_s = q_h / 3600.0
                pump_points.append(
                    {"Q_m3h": q_h, "H_bomba": max(0.0, A * (q_s**2) + B * q_s + C)}
                )
                
            intersection_ini = system.find_operating_intersection(
                req.differential_pressure, A, B, C, req.friction_formula, effective_viscosity
            )
            intersection_fin = system.find_operating_intersection(
                req.differential_pressure_final, A, B, C, req.friction_formula, effective_viscosity
            )

        system_curve_ini = system.system_curve(
            flow_sweep, req.differential_pressure, req.friction_formula
        )
        system_curve_fin = system.system_curve(
            flow_sweep, req.differential_pressure_final, req.friction_formula
        )

        return {
            "density": fluid.density,
            "Sm": fluid.mixture_sg,
            "is_slurry": fluid.is_slurry,
            "suction_velocity": pipe_suc.flow_velocity(q_m3s),
            "discharge_velocity": pipe_des.flow_velocity(q_m3s),
            "tdh_mcp": tdh_wcl,
            "tdh_mca": tdh_wcm,
            "npsha": npsha,
            "power": power,
            "cave": cave,
            "durand": durand,
            "water_hammer": water_hammer,
            "submergence_m": submergence,
            "rec_diameter": rec_diameter,
            "system_curve": system_curve_ini,
            "system_curve_final": system_curve_fin,
            "pump_curve": pump_points,
            "intersection_initial": intersection_ini,
            "intersection_final": intersection_fin,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/")
def read_index():
    return FileResponse("frontend/index.html")

app.mount("/", StaticFiles(directory="frontend"), name="frontend")