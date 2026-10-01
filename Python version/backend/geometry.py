
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Tuple, Union, Any

Number = Union[int, float]

class GeometryError(Exception):
    """Base class for every geometry-related error."""


class ZeroVectorError(GeometryError):
    """Raised when normalizing, dividing by, or projecting onto a zero vector."""


class DegenerateFigureError(GeometryError):
    """Raised when a figure is degenerate (collinear points, zero area...)."""


class ParallelLinesError(GeometryError):
    """Raised when an operation assumes non-parallel lines/planes."""


class IntersectionError(GeometryError):
    """Raised when no intersection exists between two objects."""


try:
    from sympy import sqrt as _sym_sqrt, Rational as _Rational
    _SYMPY = True
except ImportError:                                   
    _SYMPY = False
    _Rational = None

    def _sym_sqrt(x):
        return math.sqrt(float(x)) if x >= 0 else float("nan")


def _to_exact(v: Number):
    if not _SYMPY:
        return v
    if isinstance(v, int):
        return _Rational(v)
    if isinstance(v, float):
        if v == int(v):
            return _Rational(int(v))
        return _Rational(str(v))
    return v


def exact_sqrt_of_squares(*vals: Number):
    if _SYMPY:
        total = _Rational(0)
        for v in vals:
            total += _to_exact(v) ** 2
        return _sym_sqrt(total)
    return math.sqrt(sum(v * v for v in vals))


def exact_str(expr: Any) -> str:
    return str(expr)


# ====================================================================
#  VECTOR
# ====================================================================
@dataclass(frozen=True)
class Vector:
    x: Number
    y: Number
    z: Number

    @classmethod
    def from_points(cls, a: "Point", b: "Point") -> "Vector":
        return cls(b.x - a.x, b.y - a.y, b.z - a.z)

    @classmethod
    def zero(cls) -> "Vector":
        return cls(0, 0, 0)

    # ---------- basic ----------
    def components(self) -> Tuple[Number, Number, Number]:
        return (self.x, self.y, self.z)

    def __add__(self, other):
        if isinstance(other, Vector):
            return Vector(self.x + other.x, self.y + other.y, self.z + other.z)
        return NotImplemented

    def __sub__(self, other):
        if isinstance(other, Vector):
            return Vector(self.x - other.x, self.y - other.y, self.z - other.z)
        return NotImplemented

    def __neg__(self):
        return Vector(-self.x, -self.y, -self.z)

    def __mul__(self, scalar: Number):
        if isinstance(scalar, (int, float)):
            return Vector(self.x * scalar, self.y * scalar, self.z * scalar)
        return NotImplemented

    __rmul__ = __mul__

    def __truediv__(self, scalar: Number):
        if scalar == 0:
            raise ZeroVectorError("Cannot divide a vector by zero.")
        return Vector(self.x / scalar, self.y / scalar, self.z / scalar)

    def dot(self, other: "Vector") -> Number:
        return self.x * other.x + self.y * other.y + self.z * other.z

    def cross(self, other: "Vector") -> "Vector":
        return Vector(
            self.y * other.z - self.z * other.y,
            self.z * other.x - self.x * other.z,
            self.x * other.y - self.y * other.x,
        )

    def magnitude(self) -> float:
        return math.sqrt(self.dot(self))

    def magnitude_squared(self) -> Number:
        return self.dot(self)

    def magnitude_exact(self):
        return exact_sqrt_of_squares(self.x, self.y, self.z)

    def unit(self) -> "Vector":
        m = self.magnitude()
        if m == 0:
            raise ZeroVectorError("Cannot normalize a zero vector.")
        return Vector(self.x / m, self.y / m, self.z / m)

    def direction_cosines(self) -> Tuple[float, float, float]:
        m = self.magnitude()
        if m == 0:
            raise ZeroVectorError("Zero vector has no direction.")
        return (self.x / m, self.y / m, self.z / m)

    def is_zero(self, tol: float = 1e-12) -> bool:
        return self.magnitude() < tol

    def is_parallel(self, other: "Vector", tol: float = 1e-9) -> bool:
        return self.cross(other).magnitude() < tol

    def angle_with(self, other: "Vector", degrees: bool = False) -> float:
        m1, m2 = self.magnitude(), other.magnitude()
        if m1 == 0 or m2 == 0:
            raise ZeroVectorError("Cannot compute angle with a zero vector.")
        cos = self.dot(other) / (m1 * m2)
        cos = max(-1.0, min(1.0, cos))
        a = math.acos(cos)
        return math.degrees(a) if degrees else a

    def scalar_projection_on(self, onto: "Vector") -> float:
        m = onto.magnitude()
        if m == 0:
            raise ZeroVectorError("Cannot project onto a zero vector.")
        return self.dot(onto) / m

    def vector_projection_on(self, onto: "Vector") -> "Vector":
        d = onto.dot(onto)
        if d == 0:
            raise ZeroVectorError("Cannot project onto a zero vector.")
        return onto * (self.dot(onto) / d)

    def __repr__(self):
        return f"Vector({self.x}, {self.y}, {self.z})"


# ====================================================================
#  POINT
# ====================================================================
@dataclass(frozen=True)
class Point:
    x: Number
    y: Number
    z: Number

    def to_vector(self) -> Vector:
        return Vector(self.x, self.y, self.z)

    def distance_to(self, other: "Point") -> float:
        return (self - other).magnitude()

    def __sub__(self, other):
        if isinstance(other, Point):
            return Vector(self.x - other.x, self.y - other.y, self.z - other.z)
        if isinstance(other, Vector):
            return Point(self.x - other.x, self.y - other.y, self.z - other.z)
        return NotImplemented

    def __add__(self, other):
        if isinstance(other, Vector):
            return Point(self.x + other.x, self.y + other.y, self.z + other.z)
        return NotImplemented

    def __repr__(self):
        return f"Point({self.x}, {self.y}, {self.z})"


# ====================================================================
#  LINE   —  point + direction vector
# ====================================================================
@dataclass(frozen=True)
class Line:
    point: Point
    direction: Vector

    def __post_init__(self):
        if self.direction.is_zero():
            raise ZeroVectorError("Line direction must be non-zero.")

    @classmethod
    def from_two_points(cls, a: Point, b: Point) -> "Line":
        d = b - a
        if d.is_zero():
            raise DegenerateFigureError("Two identical points cannot define a line.")
        return cls(point=a, direction=d)

    def point_at(self, k: Number) -> Point:
        return self.point + self.direction * k

    def contains(self, p: Point, tol: float = 1e-9) -> bool:
        return (p - self.point).cross(self.direction).magnitude() < tol

    def is_parallel(self, other: "Line", tol: float = 1e-9) -> bool:
        return self.direction.is_parallel(other.direction, tol=tol)

    def angle_with_line(self, other: "Line", degrees: bool = False) -> float:
        return self.direction.angle_with(other.direction, degrees=degrees)

    def angle_with_plane(self, plane: "Plane", degrees: bool = False) -> float:
        d, n = self.direction, plane.normal
        denom = d.magnitude() * n.magnitude()
        if denom == 0:
            raise ZeroVectorError("Cannot compute angle with a zero vector.")
        s = max(-1.0, min(1.0, abs(d.dot(n)) / denom))
        a = math.asin(s)
        return math.degrees(a) if degrees else a

    def distance_to_point(self, p: Point) -> float:
        v = p - self.point
        return v.cross(self.direction).magnitude() / self.direction.magnitude()

    def project_point(self, p: Point) -> Point:
        """Foot of perpendicular from p onto this line."""
        ap = p - self.point
        h = self.direction
        k = ap.dot(h) / h.dot(h)
        return self.point + h * k

    def __repr__(self):
        return f"Line(point={self.point}, dir={self.direction})"


# ====================================================================
#  PLANE   —  n · r  = -d
# ====================================================================
@dataclass(frozen=True)
class Plane:
    normal: Vector
    d: Number

    def __post_init__(self):
        if self.normal.is_zero():
            raise ZeroVectorError("Plane normal must be non-zero.")

    @classmethod
    def from_point_normal(cls, p: Point, n: Vector) -> "Plane":
        d = -n.dot(p.to_vector())
        return cls(normal=n, d=d)

    @classmethod
    def from_three_points(cls, a: Point, b: Point, c: Point) -> "Plane":
        n = (b - a).cross(c - a)
        if n.is_zero():
            raise DegenerateFigureError("Points are collinear; cannot define a plane.")
        return cls.from_point_normal(a, n)

    def value_at(self, p: Point) -> Number:
        return self.normal.x * p.x + self.normal.y * p.y + self.normal.z * p.z + self.d

    def contains(self, p: Point, tol: float = 1e-9) -> bool:
        return abs(self.value_at(p)) < tol

    def distance_to_point(self, p: Point) -> float:
        return abs(self.value_at(p)) / self.normal.magnitude()

    def project_point(self, p: Point) -> Point:
        n = self.normal
        t = -self.value_at(p) / n.dot(n)
        return p + n * t

    def is_parallel(self, other: "Plane", tol: float = 1e-9) -> bool:
        return self.normal.is_parallel(other.normal, tol=tol)

    def is_identical(self, other: "Plane", tol: float = 1e-9) -> bool:
        if not self.is_parallel(other, tol):
            return False
        n1, n2 = self.normal, other.normal
        if abs(n1.x) > tol and abs(n2.x) > tol:
            k = n1.x / n2.x
        elif abs(n1.y) > tol and abs(n2.y) > tol:
            k = n1.y / n2.y
        elif abs(n1.z) > tol and abs(n2.z) > tol:
            k = n1.z / n2.z
        else:
            return True
        return abs(self.d - k * other.d) < tol

    def angle_with_plane(self, other: "Plane", degrees: bool = False) -> float:
        return self.normal.angle_with(other.normal, degrees=degrees)

    def intersect_line(self, line: Line) -> Point:
        n = self.normal
        denom = n.dot(line.direction)
        if abs(denom) < 1e-12:
            raise ParallelLinesError("Line is parallel to plane (no single intersection).")
        k = -(n.dot(line.point.to_vector()) + self.d) / denom
        return line.point_at(k)

    def intersect_plane(self, other: "Plane") -> Line:
        if self.is_parallel(other):
            raise ParallelLinesError("Planes are parallel; no unique intersection line.")
        direction = self.normal.cross(other.normal)
        a1, b1, c1 = self.normal.x, self.normal.y, self.normal.z
        a2, b2, c2 = other.normal.x, other.normal.y, other.normal.z
        d1, d2 = -self.d, -other.d

        det = a1 * b2 - a2 * b1          # try z = 0
        if abs(det) > 1e-12:
            x = (d1 * b2 - d2 * b1) / det
            y = (a1 * d2 - a2 * d1) / det
            return Line(point=Point(x, y, 0), direction=direction)
        det = a1 * c2 - a2 * c1          # try y = 0
        if abs(det) > 1e-12:
            x = (d1 * c2 - d2 * c1) / det
            z = (a1 * d2 - a2 * d1) / det
            return Line(point=Point(x, 0, z), direction=direction)
        det = b1 * c2 - b2 * c1          # try x = 0
        if abs(det) > 1e-12:
            y = (d1 * c2 - d2 * c1) / det
            z = (b1 * d2 - b2 * d1) / det
            return Line(point=Point(0, y, z), direction=direction)
        raise IntersectionError("Failed to find intersection point of planes.")

    def __repr__(self):
        return f"Plane(n={self.normal}, d={self.d})"


# ====================================================================
#  SOLID GEOMETRY  (
# ====================================================================
class SolidGeometry:
    """Static utility class — general geometry functions."""

    @staticmethod
    def midpoint(a: Point, b: Point) -> Point:
        return Point((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2)

    @staticmethod
    def distance_parallel_planes(p1: Plane, p2: Plane) -> float:
        if not p1.is_parallel(p2):
            raise ParallelLinesError("Planes are not parallel.")
        n1, n2 = p1.normal, p2.normal
        m1, m2 = n1.magnitude(), n2.magnitude()
        s = 1 if n1.dot(n2) > 0 else -1
        k = s * (m1 / m2)
        return abs(p1.d - k * p2.d) / m1

    @staticmethod
    def distance_parallel_lines(l1: Line, l2: Line) -> float:
        if not l1.is_parallel(l2):
            raise ParallelLinesError("Lines are not parallel.")
        return l1.distance_to_point(l2.point)

    @staticmethod
    def distance_skew_lines(l1: Line, l2: Line) -> float:
        n = l1.direction.cross(l2.direction)
        if n.is_zero():
            raise ParallelLinesError("Lines are parallel; use distance_parallel_lines instead.")
        ap = l2.point - l1.point
        return abs(ap.dot(n)) / n.magnitude()

    @staticmethod
    def area_triangle(a: Point, b: Point, c: Point) -> float:
        return 0.5 * (b - a).cross(c - a).magnitude()

    @staticmethod
    def area_parallelogram(a: Point, b: Point, c: Point) -> float:
        return (b - a).cross(c - a).magnitude()

    @staticmethod
    def area_quadrilateral(a: Point, b: Point, c: Point, d: Point) -> float:
        """Any planar quadrilateral: half the cross of its diagonals."""
        return 0.5 * (c - a).cross(d - b).magnitude()

    @staticmethod
    def relative_position_lines(l1: Line, l2: Line, tol: float = 1e-9) -> str:
        u1, u2 = l1.direction, l2.direction
        ap = l2.point - l1.point
        triple = u1.dot(u2.cross(ap))
        if abs(triple) > tol:
            return "skew"
        if u1.is_parallel(u2, tol):
            return "identical" if l2.contains(l1.point, tol) else "parallel"
        return "intersecting"

    @staticmethod
    def relative_position_planes(p1: Plane, p2: Plane, tol: float = 1e-9) -> str:
        if p1.is_parallel(p2, tol):
            return "identical" if p1.is_identical(p2, tol) else "parallel"
        return "intersecting"

    @staticmethod
    def relative_position_point_plane(p: Point, plane: Plane, tol: float = 1e-9) -> str:
        v = plane.value_at(p)
        if abs(v) < tol:
            return "on_plane"
        return "positive_side" if v > 0 else "negative_side"

    @staticmethod
    def relative_position_line_plane(line: Line, plane: Plane, tol: float = 1e-9) -> str:
        d_n = line.direction.dot(plane.normal)
        if abs(d_n) < tol:
            return "contained" if plane.contains(line.point, tol) else "parallel"
        return "intersecting"
