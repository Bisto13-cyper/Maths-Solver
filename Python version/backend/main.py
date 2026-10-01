from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from geometry import (
    Vector, Point, Line, Plane, SolidGeometry,
    GeometryError, exact_str,
)

app = FastAPI(
    title="3D Geometry Solver",
    description="Backend API for 3D solid geometry operations.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ====================================================================
#  SCHEMAS — the shapes the frontend is allowed to send us
# ====================================================================
class VecModel(BaseModel):
    x: float
    y: float
    z: float


class PointModel(BaseModel):
    x: float
    y: float
    z: float


class LineModel(BaseModel):
    point: PointModel
    direction: VecModel


class PlaneModel(BaseModel):
    normal: VecModel
    d: float


class TwoVectors(BaseModel):
    a: VecModel
    b: VecModel


class TwoPoints(BaseModel):
    a: PointModel
    b: PointModel


class PointLine(BaseModel):
    point: PointModel
    line: LineModel


class PointPlane(BaseModel):
    point: PointModel
    plane: PlaneModel


class TwoLines(BaseModel):
    l1: LineModel
    l2: LineModel


class TwoPlanes(BaseModel):
    p1: PlaneModel
    p2: PlaneModel


class LinePlane(BaseModel):
    line: LineModel
    plane: PlaneModel


class ThreePoints(BaseModel):
    a: PointModel
    b: PointModel
    c: PointModel


class FourPoints(BaseModel):
    a: PointModel
    b: PointModel
    c: PointModel
    d: PointModel


# ====================================================================
#  CONVERSION HELPERS
# ====================================================================
def _vec(m: VecModel) -> Vector:
    return Vector(m.x, m.y, m.z)


def _pt(m: PointModel) -> Point:
    return Point(m.x, m.y, m.z)


def _line(m: LineModel) -> Line:
    return Line(point=_pt(m.point), direction=_vec(m.direction))


def _plane(m: PlaneModel) -> Plane:
    return Plane(normal=_vec(m.normal), d=m.d)


def _vec_out(v: Vector) -> dict:
    return {"x": v.x, "y": v.y, "z": v.z}


def _pt_out(p: Point) -> dict:
    return {"x": p.x, "y": p.y, "z": p.z}


def _exact_of(v: Vector):
    try:
        return exact_str(v.magnitude_exact())
    except Exception:
        return None


def _fail(e: GeometryError):
    """Every geometry error becomes a 400 with its own message — the
    frontend shows e.detail directly to the user."""
    raise HTTPException(400, str(e))


# ====================================================================
#  VECTOR
# ====================================================================
@app.post("/vector/dot", tags=["Vector"])
def v_dot(data: TwoVectors):
    try:
        return {"dot": _vec(data.a).dot(_vec(data.b))}
    except GeometryError as e:
        _fail(e)


@app.post("/vector/cross", tags=["Vector"])
def v_cross(data: TwoVectors):
    try:
        return _vec_out(_vec(data.a).cross(_vec(data.b)))
    except GeometryError as e:
        _fail(e)


@app.post("/vector/magnitude", tags=["Vector"])
def v_magnitude(v: VecModel):
    try:
        vec = _vec(v)
        return {"value": vec.magnitude(), "exact": _exact_of(vec)}
    except GeometryError as e:
        _fail(e)


@app.post("/vector/unit", tags=["Vector"])
def v_unit(v: VecModel):
    try:
        return _vec_out(_vec(v).unit())
    except GeometryError as e:
        _fail(e)


@app.post("/vector/angle", tags=["Vector"])
def v_angle(data: TwoVectors):
    try:
        a, b = _vec(data.a), _vec(data.b)
        return {"radians": a.angle_with(b), "degrees": a.angle_with(b, degrees=True)}
    except GeometryError as e:
        _fail(e)


@app.post("/vector/direction-cosines", tags=["Vector"])
def v_dir_cos(v: VecModel):
    try:
        c = _vec(v).direction_cosines()
        return {"cos_x": c[0], "cos_y": c[1], "cos_z": c[2]}
    except GeometryError as e:
        _fail(e)


@app.post("/vector/projection", tags=["Vector"])
def v_projection(data: TwoVectors):
    """Projection of vector a onto vector b."""
    try:
        a, b = _vec(data.a), _vec(data.b)
        return {
            "scalar": a.scalar_projection_on(b),
            "vector": _vec_out(a.vector_projection_on(b)),
        }
    except GeometryError as e:
        _fail(e)


# ====================================================================
#  POINT
# ====================================================================
@app.post("/point/distance", tags=["Point"])
def p_distance(data: TwoPoints):
    try:
        return {"distance": _pt(data.a).distance_to(_pt(data.b))}
    except GeometryError as e:
        _fail(e)


@app.post("/point/midpoint", tags=["Point"])
def p_midpoint(data: TwoPoints):
    try:
        return _pt_out(SolidGeometry.midpoint(_pt(data.a), _pt(data.b)))
    except GeometryError as e:
        _fail(e)


# ====================================================================
#  LINE
# ====================================================================
@app.post("/line/from-two-points", tags=["Line"])
def l_from_points(data: TwoPoints):
    try:
        line = Line.from_two_points(_pt(data.a), _pt(data.b))
        return {"point": _pt_out(line.point), "direction": _vec_out(line.direction)}
    except GeometryError as e:
        _fail(e)


@app.post("/line/distance-from-point", tags=["Line"])
def l_dist(data: PointLine):
    try:
        return {"distance": _line(data.line).distance_to_point(_pt(data.point))}
    except GeometryError as e:
        _fail(e)


@app.post("/line/project-point", tags=["Line"])
def l_proj(data: PointLine):
    try:
        return _pt_out(_line(data.line).project_point(_pt(data.point)))
    except GeometryError as e:
        _fail(e)


@app.post("/line/relative", tags=["Line"])
def l_rel(data: TwoLines):
    try:
        rel = SolidGeometry.relative_position_lines(_line(data.l1), _line(data.l2))
        return {"relation": rel}
    except GeometryError as e:
        _fail(e)


@app.post("/line/distance-between", tags=["Line"])
def l_dist_between(data: TwoLines):
    try:
        l1, l2 = _line(data.l1), _line(data.l2)
        rel = SolidGeometry.relative_position_lines(l1, l2)
        if rel == "parallel":
            return {"relation": rel, "distance": SolidGeometry.distance_parallel_lines(l1, l2)}
        if rel == "skew":
            return {"relation": rel, "distance": SolidGeometry.distance_skew_lines(l1, l2)}
        return {"relation": rel, "distance": 0.0}
    except GeometryError as e:
        _fail(e)


@app.post("/line/angle", tags=["Line"])
def l_angle(data: TwoLines):
    try:
        l1, l2 = _line(data.l1), _line(data.l2)
        return {"radians": l1.angle_with_line(l2), "degrees": l1.angle_with_line(l2, degrees=True)}
    except GeometryError as e:
        _fail(e)


@app.post("/line/angle-with-plane", tags=["Line"])
def l_angle_plane(data: LinePlane):
    try:
        line, plane = _line(data.line), _plane(data.plane)
        return {
            "radians": line.angle_with_plane(plane),
            "degrees": line.angle_with_plane(plane, degrees=True),
        }
    except GeometryError as e:
        _fail(e)


# ====================================================================
#  PLANE
# ====================================================================
@app.post("/plane/from-three-points", tags=["Plane"])
def pl_from_points(data: ThreePoints):
    try:
        plane = Plane.from_three_points(_pt(data.a), _pt(data.b), _pt(data.c))
        return {"normal": _vec_out(plane.normal), "d": plane.d}
    except GeometryError as e:
        _fail(e)


@app.post("/plane/distance-from-point", tags=["Plane"])
def pl_dist(data: PointPlane):
    try:
        return {"distance": _plane(data.plane).distance_to_point(_pt(data.point))}
    except GeometryError as e:
        _fail(e)


@app.post("/plane/project-point", tags=["Plane"])
def pl_proj(data: PointPlane):
    try:
        return _pt_out(_plane(data.plane).project_point(_pt(data.point)))
    except GeometryError as e:
        _fail(e)


@app.post("/plane/point-position", tags=["Plane"])
def pl_point_position(data: PointPlane):
    try:
        rel = SolidGeometry.relative_position_point_plane(_pt(data.point), _plane(data.plane))
        return {"relation": rel}
    except GeometryError as e:
        _fail(e)


@app.post("/plane/relative", tags=["Plane"])
def pl_rel(data: TwoPlanes):
    try:
        rel = SolidGeometry.relative_position_planes(_plane(data.p1), _plane(data.p2))
        return {"relation": rel}
    except GeometryError as e:
        _fail(e)


@app.post("/plane/angle", tags=["Plane"])
def pl_angle(data: TwoPlanes):
    try:
        p1, p2 = _plane(data.p1), _plane(data.p2)
        return {"radians": p1.angle_with_plane(p2), "degrees": p1.angle_with_plane(p2, degrees=True)}
    except GeometryError as e:
        _fail(e)


@app.post("/plane/intersect-line", tags=["Plane"])
def pl_int_line(data: LinePlane):
    try:
        return _pt_out(_plane(data.plane).intersect_line(_line(data.line)))
    except GeometryError as e:
        _fail(e)


@app.post("/plane/intersect-plane", tags=["Plane"])
def pl_int_plane(data: TwoPlanes):
    try:
        line = _plane(data.p1).intersect_plane(_plane(data.p2))
        return {"point": _pt_out(line.point), "direction": _vec_out(line.direction)}
    except GeometryError as e:
        _fail(e)


@app.post("/plane/line-relative", tags=["Plane"])
def pl_line_rel(data: LinePlane):
    try:
        rel = SolidGeometry.relative_position_line_plane(_line(data.line), _plane(data.plane))
        return {"relation": rel}
    except GeometryError as e:
        _fail(e)


# ====================================================================
#  AREA
# ====================================================================
@app.post("/area/triangle", tags=["Area"])
def a_tri(data: ThreePoints):
    try:
        return {"area": SolidGeometry.area_triangle(_pt(data.a), _pt(data.b), _pt(data.c))}
    except GeometryError as e:
        _fail(e)


@app.post("/area/parallelogram", tags=["Area"])
def a_para(data: ThreePoints):
    try:
        return {"area": SolidGeometry.area_parallelogram(_pt(data.a), _pt(data.b), _pt(data.c))}
    except GeometryError as e:
        _fail(e)


@app.post("/area/quadrilateral", tags=["Area"])
def a_quad(data: FourPoints):
    try:
        return {
            "area": SolidGeometry.area_quadrilateral(
                _pt(data.a), _pt(data.b), _pt(data.c), _pt(data.d)
            )
        }
    except GeometryError as e:
        _fail(e)


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "engine": "3D Geometry Solver", "version": "2.0.0"}
