"use strict";

/* ---------- EXCEPTIONS ---------- */
class GeometryError extends Error {}
class ZeroVectorError extends GeometryError {}
class DegenerateFigureError extends GeometryError {}
class ParallelLinesError extends GeometryError {}
class IntersectionError extends GeometryError {}

/* ---------- EXACT ROOTS (integer-only approximation of sympy) ---------- */
/**
 * Returns the exact form of sqrt(sum(v_i^2)) as a sympy-like string.
 *   exactSqrtOfSquares(2, 2, 2) -> "2*sqrt(3)"
 *   exactSqrtOfSquares(1, 1, 1) -> "sqrt(3)"
 *   exactSqrtOfSquares(0, 0, 5) -> "5"
 *   Non-integer inputs -> decimal string.
 */
function exactSqrtOfSquares(...vals) {
  if (!vals.every(v => Number.isInteger(v))) {
    const s = Math.sqrt(vals.reduce((a, v) => a + v * v, 0));
    return String(s);
  }
  let sum = 0;
  for (const v of vals) sum += v * v;
  if (sum === 0) return "0";
  if (sum === 1) return "1";
  let k = 1, m = sum;
  for (let i = 2; i * i <= m; ) {
    if (m % (i * i) === 0) { m /= i * i; k *= i; } else i++;
  }
  if (m === 1) return String(k);
  if (k === 1) return `sqrt(${m})`;
  return `${k}*sqrt(${m})`;
}

/* ====================================================================
   VECTOR
   ==================================================================== */
class Vector {
  constructor(x, y, z) { this.x = x; this.y = y; this.z = z; }

  static fromPoints(a, b) { return new Vector(b.x - a.x, b.y - a.y, b.z - a.z); }
  static zero() { return new Vector(0, 0, 0); }

  components() { return [this.x, this.y, this.z]; }

  add(o)   { return new Vector(this.x + o.x, this.y + o.y, this.z + o.z); }
  sub(o)   { return new Vector(this.x - o.x, this.y - o.y, this.z - o.z); }
  neg()    { return new Vector(-this.x, -this.y, -this.z); }
  scale(k) { return new Vector(this.x * k, this.y * k, this.z * k); }
  div(k)   {
    if (k === 0) throw new ZeroVectorError("Cannot divide a vector by zero.");
    return new Vector(this.x / k, this.y / k, this.z / k);
  }

  dot(o)  { return this.x * o.x + this.y * o.y + this.z * o.z; }
  cross(o) {
    return new Vector(
      this.y * o.z - this.z * o.y,
      this.z * o.x - this.x * o.z,
      this.x * o.y - this.y * o.x
    );
  }

  magnitude()        { return Math.sqrt(this.dot(this)); }
  magnitudeSquared() { return this.dot(this); }
  magnitudeExact()   { return exactSqrtOfSquares(this.x, this.y, this.z); }

  unit() {
    const m = this.magnitude();
    if (m === 0) throw new ZeroVectorError("Cannot normalize a zero vector.");
    return new Vector(this.x / m, this.y / m, this.z / m);
  }

  directionCosines() {
    const m = this.magnitude();
    if (m === 0) throw new ZeroVectorError("Zero vector has no direction.");
    return [this.x / m, this.y / m, this.z / m];
  }

  isZero(tol = 1e-12)          { return this.magnitude() < tol; }
  isParallel(other, tol = 1e-9){ return this.cross(other).magnitude() < tol; }

  angleWith(other, degrees = false) {
    const m1 = this.magnitude(), m2 = other.magnitude();
    if (m1 === 0 || m2 === 0) throw new ZeroVectorError("Cannot compute angle with a zero vector.");
    let cos = this.dot(other) / (m1 * m2);
    cos = Math.max(-1, Math.min(1, cos));
    const a = Math.acos(cos);
    return degrees ? a * 180 / Math.PI : a;
  }

  scalarProjectionOn(onto) {
    const m = onto.magnitude();
    if (m === 0) throw new ZeroVectorError("Cannot project onto a zero vector.");
    return this.dot(onto) / m;
  }

  vectorProjectionOn(onto) {
    const d = onto.dot(onto);
    if (d === 0) throw new ZeroVectorError("Cannot project onto a zero vector.");
    return onto.scale(this.dot(onto) / d);
  }
}

/* ====================================================================
   POINT
   ==================================================================== */
class Point {
  constructor(x, y, z) { this.x = x; this.y = y; this.z = z; }

  toVector() { return new Vector(this.x, this.y, this.z); }
  distanceTo(other) { return this.sub(other).magnitude(); }

  sub(o) {
    if (o instanceof Point)  return new Vector(this.x - o.x, this.y - o.y, this.z - o.z);
    if (o instanceof Vector) return new Point(this.x - o.x, this.y - o.y, this.z - o.z);
    throw new TypeError("Point.sub expects Point or Vector");
  }
  add(v) {
    if (v instanceof Vector) return new Point(this.x + v.x, this.y + v.y, this.z + v.z);
    throw new TypeError("Point.add expects Vector");
  }
}

/* ====================================================================
   LINE — point + direction
   ==================================================================== */
class Line {
  constructor(point, direction) {
    if (direction.isZero()) throw new ZeroVectorError("Line direction must be non-zero.");
    this.point = point;
    this.direction = direction;
  }
  static fromTwoPoints(a, b) {
    const d = b.sub(a);
    if (d.isZero()) throw new DegenerateFigureError("Two identical points cannot define a line.");
    return new Line(a, d);
  }
  pointAt(k) { return this.point.add(this.direction.scale(k)); }
  contains(p, tol = 1e-9) { return p.sub(this.point).cross(this.direction).magnitude() < tol; }
  isParallel(other, tol = 1e-9) { return this.direction.isParallel(other.direction, tol); }
  angleWithLine(other, degrees = false) { return this.direction.angleWith(other.direction, degrees); }
  angleWithPlane(plane, degrees = false) {
    const d = this.direction, n = plane.normal;
    const denom = d.magnitude() * n.magnitude();
    if (denom === 0) throw new ZeroVectorError("Cannot compute angle with a zero vector.");
    const s = Math.max(-1, Math.min(1, Math.abs(d.dot(n)) / denom));
    const a = Math.asin(s);
    return degrees ? a * 180 / Math.PI : a;
  }
  distanceToPoint(p) {
    const v = p.sub(this.point);
    return v.cross(this.direction).magnitude() / this.direction.magnitude();
  }
  projectPoint(p) {
    const ap = p.sub(this.point);
    const h = this.direction;
    const k = ap.dot(h) / h.dot(h);
    return this.point.add(h.scale(k));
  }
}

/* ====================================================================
   PLANE — n·r + d = 0
   ==================================================================== */
class Plane {
  constructor(normal, d) {
    if (normal.isZero()) throw new ZeroVectorError("Plane normal must be non-zero.");
    this.normal = normal;
    this.d = d;
  }
  static fromPointNormal(p, n) { return new Plane(n, -n.dot(p.toVector())); }
  static fromThreePoints(a, b, c) {
    const n = b.sub(a).cross(c.sub(a));
    if (n.isZero()) throw new DegenerateFigureError("Points are collinear; cannot define a plane.");
    return Plane.fromPointNormal(a, n);
  }

  valueAt(p) { return this.normal.x * p.x + this.normal.y * p.y + this.normal.z * p.z + this.d; }
  contains(p, tol = 1e-9) { return Math.abs(this.valueAt(p)) < tol; }
  distanceToPoint(p) { return Math.abs(this.valueAt(p)) / this.normal.magnitude(); }
  projectPoint(p) {
    const n = this.normal;
    const t = -this.valueAt(p) / n.dot(n);
    return p.add(n.scale(t));
  }
  isParallel(other, tol = 1e-9) { return this.normal.isParallel(other.normal, tol); }
  isIdentical(other, tol = 1e-9) {
    if (!this.isParallel(other, tol)) return false;
    const n1 = this.normal, n2 = other.normal;
    let k;
    if (Math.abs(n1.x) > tol && Math.abs(n2.x) > tol)      k = n1.x / n2.x;
    else if (Math.abs(n1.y) > tol && Math.abs(n2.y) > tol) k = n1.y / n2.y;
    else if (Math.abs(n1.z) > tol && Math.abs(n2.z) > tol) k = n1.z / n2.z;
    else return true;
    return Math.abs(this.d - k * other.d) < tol;
  }
  angleWithPlane(other, degrees = false) { return this.normal.angleWith(other.normal, degrees); }

  intersectLine(line) {
    const n = this.normal;
    const denom = n.dot(line.direction);
    if (Math.abs(denom) < 1e-12)
      throw new ParallelLinesError("Line is parallel to plane (no single intersection).");
    const k = -(n.dot(line.point.toVector()) + this.d) / denom;
    return line.pointAt(k);
  }

  intersectPlane(other) {
    if (this.isParallel(other))
      throw new ParallelLinesError("Planes are parallel; no unique intersection line.");
    const direction = this.normal.cross(other.normal);
    const a1 = this.normal.x, b1 = this.normal.y, c1 = this.normal.z;
    const a2 = other.normal.x, b2 = other.normal.y, c2 = other.normal.z;
    const d1 = -this.d, d2 = -other.d;

    let det = a1 * b2 - a2 * b1;
    if (Math.abs(det) > 1e-12) {
      const x = (d1 * b2 - d2 * b1) / det;
      const y = (a1 * d2 - a2 * d1) / det;
      return new Line(new Point(x, y, 0), direction);
    }
    det = a1 * c2 - a2 * c1;
    if (Math.abs(det) > 1e-12) {
      const x = (d1 * c2 - d2 * c1) / det;
      const z = (a1 * d2 - a2 * d1) / det;
      return new Line(new Point(x, 0, z), direction);
    }
    det = b1 * c2 - b2 * c1;
    if (Math.abs(det) > 1e-12) {
      const y = (d1 * c2 - d2 * c1) / det;
      const z = (b1 * d2 - b2 * d1) / det;
      return new Line(new Point(0, y, z), direction);
    }
    throw new IntersectionError("Failed to find intersection point of planes.");
  }
}

/* ====================================================================
   SOLID GEOMETRY (namespace of static helpers)
   ==================================================================== */
const SolidGeometry = {
  midpoint(a, b) { return new Point((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); },

  distanceParallelPlanes(p1, p2) {
    if (!p1.isParallel(p2)) throw new ParallelLinesError("Planes are not parallel.");
    const n1 = p1.normal, n2 = p2.normal;
    const m1 = n1.magnitude(), m2 = n2.magnitude();
    const s = n1.dot(n2) > 0 ? 1 : -1;
    const k = s * (m1 / m2);
    return Math.abs(p1.d - k * p2.d) / m1;
  },
  distanceParallelLines(l1, l2) {
    if (!l1.isParallel(l2)) throw new ParallelLinesError("Lines are not parallel.");
    return l1.distanceToPoint(l2.point);
  },
  distanceSkewLines(l1, l2) {
    const n = l1.direction.cross(l2.direction);
    if (n.isZero()) throw new ParallelLinesError("Lines are parallel; use distance_parallel_lines instead.");
    const ap = l2.point.sub(l1.point);
    return Math.abs(ap.dot(n)) / n.magnitude();
  },

  areaTriangle(a, b, c)        { return 0.5 * b.sub(a).cross(c.sub(a)).magnitude(); },
  areaParallelogram(a, b, c)   { return       b.sub(a).cross(c.sub(a)).magnitude(); },
  areaQuadrilateral(a, b, c, d){ return 0.5 * c.sub(a).cross(d.sub(b)).magnitude(); },

  relativePositionLines(l1, l2, tol = 1e-9) {
    const u1 = l1.direction, u2 = l2.direction;
    const ap = l2.point.sub(l1.point);
    const triple = u1.dot(u2.cross(ap));
    if (Math.abs(triple) > tol) return "skew";
    if (u1.isParallel(u2, tol)) return l2.contains(l1.point, tol) ? "identical" : "parallel";
    return "intersecting";
  },
  relativePositionPlanes(p1, p2, tol = 1e-9) {
    if (p1.isParallel(p2, tol)) return p1.isIdentical(p2, tol) ? "identical" : "parallel";
    return "intersecting";
  },
  relativePositionPointPlane(p, plane, tol = 1e-9) {
    const v = plane.valueAt(p);
    if (Math.abs(v) < tol) return "on_plane";
    return v > 0 ? "positive_side" : "negative_side";
  },
  relativePositionLinePlane(line, plane, tol = 1e-9) {
    const dn = line.direction.dot(plane.normal);
    if (Math.abs(dn) < tol) return plane.contains(line.point, tol) ? "contained" : "parallel";
    return "intersecting";
  },
};