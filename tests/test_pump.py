import pytest
import math
from src.pump_model import Fluid, Pipe, PumpingSystem

def test_fluid_density_slurry():
    # Concentration 55%, Solid SG 4.60
    fluid = Fluid.from_concentration(0.55, 4.60, 1.5e-6, 0.24)
    expected_density = 1000.0 / (0.55 / 4.60 + (1.0 - 0.55))
    assert math.isclose(fluid.density, expected_density, rel_tol=1e-4)
    assert fluid.is_slurry is True
    assert fluid.solid_sg == 4.60

def test_pipe_velocity_and_reynolds():
    # Diameter 0.25m, Length 100m, Flow rate 324 m3/h -> 0.09 m3/s
    pipe = Pipe(inner_diameter=0.25, length=100.0, roughness=0.00025, total_k=5.0)
    q_m3s = 324.0 / 3600.0
    
    v = pipe.flow_velocity(q_m3s)
    area = math.pi * (0.25**2) / 4.0
    assert math.isclose(v, q_m3s / area, rel_tol=1e-4)
    
    re = pipe.reynolds_number(q_m3s, 1.5e-6)
    assert math.isclose(re, (v * 0.25) / 1.5e-6, rel_tol=1e-4)

def test_friction_factor_haaland():
    pipe = Pipe(inner_diameter=0.25, length=100.0, roughness=0.00025, total_k=0.0)
    # Laminar flow
    assert pipe.friction_factor(1000) == 64.0 / 1000
    
    # Turbulent flow - Haaland standard
    re = 150000
    f = pipe.friction_factor(re)
    term = (0.00025 / (3.7 * 0.25))**1.11 + (6.9 / re)
    expected_f = (-1.8 * math.log10(term))**-2
    assert math.isclose(f, expected_f, rel_tol=1e-4)

def test_custom_dynamic_friction_injection():
    pipe = Pipe(inner_diameter=0.25, length=100.0, roughness=0.00025, total_k=0.0)
    custom_laminar_formula = "return 64.0 / reynolds;"
    f_calc = pipe.friction_factor(1500, custom_formula=custom_laminar_formula)
    assert f_calc == 64.0 / 1500

def test_pumping_system_tdh_and_npsha():
    fluid = Fluid(density=1000.0, kinematic_viscosity=1.0e-6, vapor_pressure_wcm=0.24)
    suc = Pipe(0.30, 10.0, 0.00025, 2.0)
    des = Pipe(0.25, 200.0, 0.00025, 8.0)
    
    system = PumpingSystem(fluid, suc, des, total_static_head=30.0, suction_lift=2.5, atmospheric_pressure_wcm=10.33)
    q_m3s = 150.0 / 3600.0
    
    tdh = system.calculate_tdh(q_m3s, differential_pressure_wcm=0.0)
    assert tdh > 30.0 
    
    npsha = system.calculate_npsha(q_m3s)
    hf_suc = suc.total_losses(q_m3s, 1.0e-6)
    expected_npsha = (10.33 - 0.24) / 1.0 + 2.5 - hf_suc
    assert math.isclose(npsha, expected_npsha, rel_tol=1e-4)

def test_critical_submergence():
    fluid = Fluid(1000.0, 1.0e-6, 0.24)
    suc = Pipe(0.30, 5.0, 0.00025, 0.0)
    des = Pipe(0.25, 50.0, 0.00025, 0.0)
    system = PumpingSystem(fluid, suc, des, 10.0, 2.0, 10.33)
    
    q_m3s = 200.0 / 3600.0
    h_s = system.calculate_critical_submergence(q_m3s)
    v_suc = suc.flow_velocity(q_m3s)
    expected_h_s = 0.30 * (1.0 + 2.3 * (v_suc / math.sqrt(9.81 * 0.30)))
    assert math.isclose(h_s, expected_h_s, rel_tol=1e-4)

def test_durand_critical_velocity():
    # Corrected formula must use solid_sg (Ss) instead of mixture_sg (Sm)
    fluid = Fluid.from_concentration(solids_concentration=0.55, solid_sg=4.60, kinematic_viscosity=1.5e-6, vapor_pressure_wcm=0.24)
    suc = Pipe(0.30, 10.0, 0.00025, 0.0)
    des = Pipe(0.25, 100.0, 0.00025, 0.0)
    system = PumpingSystem(fluid, suc, des, 40.0, 2.5, 10.33)
    
    # Check default corrected Durand: VL = 1.25 * FL * sqrt(2 * g * D * (solid_sg - 1.0))
    res = system.durand_critical_velocity(FL=1.0)
    expected_VL = 1.25 * 1.0 * math.sqrt(2.0 * 9.81 * 0.25 * (4.60 - 1.0))
    assert math.isclose(res["VL_ms"], expected_VL, rel_tol=1e-4)

    # Check custom formula with Ss and Sm context
    custom_formula = "return fl * sqrt(2 * g * diametro * (Ss - 1))"
    res_custom = system.durand_critical_velocity(FL=1.0, custom_durand=custom_formula)
    expected_custom_VL = 1.0 * math.sqrt(2.0 * 9.81 * 0.25 * (4.60 - 1.0))
    assert math.isclose(res_custom["VL_ms"], expected_custom_VL, rel_tol=1e-4)

def test_korteweg_celerity_context():
    fluid = Fluid(density=1200.0, kinematic_viscosity=1.0e-6, vapor_pressure_wcm=0.24)
    suc = Pipe(0.30, 10.0, 0.00025, 0.0)
    des = Pipe(0.25, 100.0, 0.00025, 0.0)
    system = PumpingSystem(fluid, suc, des, 40.0, 2.5, 10.33)
    
    # Custom formula using the dynamic density variable from context
    custom_formula = "return sqrt(2.0e9 / density) / sqrt(1.0 + (2.0e9 / E) * (D / espesor))"
    celerity = system.calculate_dynamic_celerity(1000.0, "acero", custom_formula)
    
    E = 2.0e11
    D = 0.25
    espesor = D / 20.0
    expected_celerity = math.sqrt(2.0e9 / 1200.0) / math.sqrt(1.0 + (2.0e9 / E) * (D / espesor))
    assert math.isclose(celerity, expected_celerity, rel_tol=1e-4)
