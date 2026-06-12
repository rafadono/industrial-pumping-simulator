import math
from dataclasses import dataclass
from typing import Dict, List

GRAVITY = 9.81
METRIC_HP = 75.0      
HP_TO_KW = 0.735499     

@dataclass
class Fluid:
    density: float                  # kg/m³
    kinematic_viscosity: float      # m²/s
    vapor_pressure_wcm: float       # w.c.m. (water column meters)
    is_slurry: bool = False
    froth_factor: float = 1.0       # Cs
    solid_sg: float = 1.0           # Specific gravity of solids (Ss)

    @property
    def mixture_sg(self) -> float:
        return self.density / 1000.0

    # Retain Sm as an alias for backward compatibility in formulas
    @property
    def Sm(self) -> float:
        return self.mixture_sg

    @classmethod
    def from_concentration(
        cls,
        solids_concentration: float,  # cp
        solid_sg: float,              # ge_solidos
        kinematic_viscosity: float,
        vapor_pressure_wcm: float,
        froth_factor: float = 1.0,
    ) -> "Fluid":
        if not (0.0 < solids_concentration < 1.0):
            raise ValueError("Solids concentration (cp) must be between 0 and 1 (exclusive).")
        density = 1000.0 / (solids_concentration / solid_sg + (1.0 - solids_concentration))
        return cls(
            density=density,
            kinematic_viscosity=kinematic_viscosity,
            vapor_pressure_wcm=vapor_pressure_wcm,
            is_slurry=True,
            froth_factor=froth_factor,
            solid_sg=solid_sg,
        )

    def calculate_dynamic_viscosity(self, solids_concentration: float, solid_sg: float, custom_formula: str = None) -> float:
        cv = (solids_concentration / solid_sg) / (solids_concentration / solid_sg + (1.0 - solids_concentration)) if self.is_slurry else 0.0
        water_visc = self.kinematic_viscosity
        
        if custom_formula and custom_formula.strip():
            try:
                context = {"cv": cv, "visc_agua": water_visc, "cp": solids_concentration, "exp": math.exp, "pow": math.pow, "math": math, "Math": math}
                expr = custom_formula.replace("Math.exp", "exp").replace("Math.pow", "pow")
                if "return " in expr: expr = expr.split("return ")[-1].strip().rstrip(";")
                return float(eval(expr, {"__builtins__": None}, context))
            except Exception:
                pass
        return water_visc

class Pipe:
    def __init__(self, inner_diameter: float, length: float, roughness: float, total_k: float):
        self.inner_diameter = inner_diameter
        self.length = length
        self.roughness = roughness
        self.total_k = total_k

    def cross_sectional_area(self) -> float:
        return math.pi * (self.inner_diameter ** 2) / 4.0

    def flow_velocity(self, flow_rate_m3s: float) -> float:
        area = self.cross_sectional_area()
        return flow_rate_m3s / area if area > 0 else 0.0

    def reynolds_number(self, flow_rate_m3s: float, kinematic_viscosity: float) -> float:
        v = self.flow_velocity(flow_rate_m3s)
        return (v * self.inner_diameter) / kinematic_viscosity if kinematic_viscosity > 0 else 0.0

    def friction_factor(self, reynolds: float, custom_formula: str = None) -> float:
        if reynolds <= 0: return 0.0
        
        if custom_formula and custom_formula.strip():
            try:
                context = {
                    "reynolds": reynolds, "rugosidad": self.roughness, "diametro": self.inner_diameter,
                    "pow": math.pow, "log10": math.log10, "sqrt": math.sqrt, "math": math, "Math": math
                }
                expr = custom_formula.replace("Math.pow", "pow").replace("Math.log10", "log10").replace("Math.sqrt", "sqrt")
                if "return " in expr: expr = expr.split("return ")[-1].strip().rstrip(";")
                return float(eval(expr, {"__builtins__": None}, context))
            except Exception:
                pass

        if reynolds < 2000: return 64.0 / reynolds
        # Haaland Formula
        term = (self.roughness / (3.7 * self.inner_diameter)) ** 1.11 + (6.9 / reynolds)
        return (-1.8 * math.log10(term)) ** -2

    def total_losses(self, flow_rate_m3s: float, kinematic_viscosity: float, custom_formula: str = None) -> float:
        v = self.flow_velocity(flow_rate_m3s)
        if v == 0: return 0.0
        re = self.reynolds_number(flow_rate_m3s, kinematic_viscosity)
        f = self.friction_factor(re, custom_formula)
        hf = f * (self.length / self.inner_diameter) * (v ** 2 / (2.0 * GRAVITY))
        hs = self.total_k * (v ** 2 / (2.0 * GRAVITY))
        return hf + hs

class PumpingSystem:
    def __init__(self, fluid: Fluid, suction_pipe: Pipe, discharge_pipe: Pipe, total_static_head: float, suction_lift: float, atmospheric_pressure_wcm: float):
        self.fluid = fluid
        self.suction_pipe = suction_pipe
        self.discharge_pipe = discharge_pipe
        self.total_static_head = total_static_head
        self.suction_lift = suction_lift
        self.atmospheric_pressure_wcm = atmospheric_pressure_wcm

    def wcl_to_wcm(self, value_wcl: float) -> float:
        return value_wcl * self.fluid.mixture_sg

    def wcm_to_wcl(self, value_wcm: float) -> float:
        return value_wcm / self.fluid.mixture_sg if self.fluid.mixture_sg > 0 else 0.0

    def calculate_tdh(self, flow_rate_m3s: float, differential_pressure_wcm: float = 0.0, custom_friction: str = None, effective_viscosity: float = None) -> float:
        v_util = effective_viscosity if effective_viscosity is not None else self.fluid.kinematic_viscosity
        ht_suc = self.suction_pipe.total_losses(flow_rate_m3s, v_util, custom_friction)
        ht_des = self.discharge_pipe.total_losses(flow_rate_m3s, v_util, custom_friction)
        diff_press_wcl = self.wcm_to_wcl(differential_pressure_wcm)
        return self.total_static_head + diff_press_wcl + ht_suc + ht_des

    def calculate_npsha(self, flow_rate_m3s: float, custom_friction: str = None, effective_viscosity: float = None) -> float:
        v_util = effective_viscosity if effective_viscosity is not None else self.fluid.kinematic_viscosity
        hf_suc = self.suction_pipe.total_losses(flow_rate_m3s, v_util, custom_friction)
        return (self.atmospheric_pressure_wcm - self.fluid.vapor_pressure_wcm) / self.fluid.mixture_sg + self.suction_lift - hf_suc

    def calculate_critical_submergence(self, flow_rate_m3s: float) -> float:
        v_suc = self.suction_pipe.flow_velocity(flow_rate_m3s)
        d_suc = self.suction_pipe.inner_diameter
        if d_suc <= 0: return 0.0
        return d_suc * (1.0 + 2.3 * (v_suc / math.sqrt(GRAVITY * d_suc)))

    def recommend_line_diameter(self, flow_rate_m3s: float) -> Dict[str, float]:
        v_min = 1.2
        v_max = 2.5 if self.fluid.is_slurry else 3.5
        d_min = math.sqrt((4.0 * flow_rate_m3s) / (math.pi * v_max)) if flow_rate_m3s > 0 else 0.0
        d_max = math.sqrt((4.0 * flow_rate_m3s) / (math.pi * v_min)) if flow_rate_m3s > 0 else 0.0
        return {"d_min_m": d_min, "d_max_m": d_max}

    def calculate_motor_power(self, flow_rate_m3s: float, tdh_wcl: float, pump_efficiency: float, motor_efficiency: float = 0.95, ER: float = 1.0, safety_factor: float = 1.1) -> Dict[str, float]:
        global_eff = (pump_efficiency / 100.0) * motor_efficiency * ER * self.fluid.froth_factor
        if global_eff <= 0: global_eff = 0.01
        flow_rate_lps = flow_rate_m3s * 1000.0
        P_cv = (self.fluid.mixture_sg * flow_rate_lps * tdh_wcl) / (METRIC_HP * global_eff)
        P_cv_fs = P_cv * safety_factor
        return {"P_cv": P_cv_fs, "P_kw": P_cv_fs * HP_TO_KW}

    def calculate_selection_head_cave(self, tdh_wcl: float, HR: float) -> Dict[str, float]:
        denom = HR * self.fluid.froth_factor
        h_water = tdh_wcl / denom if denom > 0 else tdh_wcl
        return {"H_agua_seleccion_mca": h_water}

    def system_curve(self, flow_rates_m3h: List[float], differential_pressure_wcm: float = 0.0, custom_friction: str = None, effective_viscosity: float = None) -> List[Dict[str, float]]:
        points = []
        for q_m3h in flow_rates_m3h:
            q = q_m3h / 3600.0
            tdh_wcl = self.calculate_tdh(q, differential_pressure_wcm, custom_friction, effective_viscosity)
            points.append({"Q_m3h": q_m3h, "TDH_mcp": tdh_wcl})
        return points

    def evaluate_cave_factors(self, hr_base: float, er_base: float, solids_concentration: float, custom_formula: str = None) -> Dict[str, float]:
        if custom_formula and custom_formula.strip():
            try:
                context = {"hr_base": hr_base, "er_base": er_base, "cp": solids_concentration, "log": math.log, "math": math, "Math": math}
                expr = custom_formula
                if "return " in expr: expr = expr.split("return ")[-1].strip().rstrip(";")
                return eval(expr, {"__builtins__": None}, context)
            except Exception:
                pass
        return {"HR": hr_base, "ER": er_base}

    def calculate_dynamic_celerity(self, base_celerity: float, material: str, custom_formula: str = None) -> float:
        pipe_moduli = {"acero": 2.0e11, "hdpe": 1.0e9, "pvc": 3.0e9}
        E = pipe_moduli.get(material, 2.0e11)
        D = self.discharge_pipe.inner_diameter
        thickness = D / 20.0 
        
        if custom_formula and custom_formula.strip():
            try:
                # Include fluid density in context
                context = {
                    "celeridad_base": base_celerity, "E": E, "D": D, "espesor": thickness,
                    "density": self.fluid.density, "densidad": self.fluid.density,
                    "sqrt": math.sqrt, "math": math, "Math": math
                }
                expr = custom_formula.replace("Math.sqrt", "sqrt")
                if "return " in expr: expr = expr.split("return ")[-1].strip().rstrip(";")
                return float(eval(expr, {"__builtins__": None}, context))
            except Exception:
                pass
        return base_celerity

    def durand_critical_velocity(self, FL: float, custom_durand: str = None) -> Dict[str, float]:
        if self.fluid.mixture_sg <= 1.0: return {"VL_ms": 0.0}
        ge_s = self.fluid.solid_sg
        if custom_durand and custom_durand.strip():
            try:
                context = {
                    "fl": FL, "g": GRAVITY, "diametro": self.discharge_pipe.inner_diameter,
                    "Sm": self.fluid.mixture_sg, "sm": self.fluid.mixture_sg,
                    "Ss": ge_s, "ss": ge_s,
                    "pow": math.pow, "sqrt": math.sqrt, "math": math, "Math": math
                }
                expr = custom_durand.replace("Math.pow", "pow").replace("Math.sqrt", "sqrt")
                if "return " in expr: expr = expr.split("return ")[-1].strip().rstrip(";")
                return {"VL_ms": float(eval(expr, {"__builtins__": None}, context))}
            except Exception:
                pass
        # Corrected equation: uses ge_s (solid_sg) instead of Sm (mixture specific gravity)
        VL = 1.25 * FL * math.sqrt(2.0 * GRAVITY * self.discharge_pipe.inner_diameter * (ge_s - 1.0))
        return {"VL_ms": VL}

    def check_water_hammer(self, flow_rate_m3s: float, wave_celerity: float, closure_time: float) -> Dict:
        v = self.discharge_pipe.flow_velocity(flow_rate_m3s)
        critical_time = (2.0 * self.discharge_pipe.length) / wave_celerity if wave_celerity > 0 else 0.01
        if closure_time <= critical_time:
            method = "Allievi"
            overpressure = (wave_celerity * v) / GRAVITY
        else:
            method = "Michaud"
            overpressure = (2.0 * self.discharge_pipe.length * v) / (GRAVITY * max(0.01, closure_time))
        return {"method": method, "overpressure_wcm": overpressure}

    def find_operating_intersection(self, differential_pressure_wcm: float, A: float, B: float, C: float, custom_friction: str = None, effective_viscosity: float = None) -> Dict[str, float]:
        def residue(q_m3s):
            return self.calculate_tdh(q_m3s, differential_pressure_wcm, custom_friction, effective_viscosity) - (A * (q_m3s**2) + B * q_m3s + C)
        
        low, high = 0.0, 600.0 / 3600.0
        if residue(low) * residue(high) > 0:
            return {"Q_m3h": 0.0, "H_mcl": 0.0}
            
        for _ in range(40):
            mid = (low + high) / 2.0
            if abs(residue(mid)) < 1e-4: break
            if residue(low) * residue(mid) < 0: high = mid
            else: low = mid
        return {"Q_m3h": mid * 3600.0, "H_mcl": (A * (mid**2) + B * mid + C)}
