"use strict";

const toVec = m => new Vector(m.x, m.y, m.z);
const toPt  = m => new Point(m.x, m.y, m.z);
const toLine = m => new Line(toPt(m.point), toVec(m.direction));
const toPlane = m => new Plane(toVec(m.normal), m.d);
const vecOut = v => ({ x: v.x, y: v.y, z: v.z });
const ptOut  = p => ({ x: p.x, y: p.y, z: p.z });

const SOLVER = {
  /* ---------- VECTOR ---------- */
  "/vector/dot": (d) => ({ dot: toVec(d.a).dot(toVec(d.b)) }),
  "/vector/cross": (d) => vecOut(toVec(d.a).cross(toVec(d.b))),
  "/vector/magnitude": (v) => {
    const V = toVec(v);
    return { value: V.magnitude(), exact: V.magnitudeExact() };
  },
  "/vector/unit": (v) => vecOut(toVec(v).unit()),
  "/vector/angle": (d) => {
    const a = toVec(d.a), b = toVec(d.b);
    return { radians: a.angleWith(b), degrees: a.angleWith(b, true) };
  },
  "/vector/direction-cosines": (v) => {
    const c = toVec(v).directionCosines();
    return { cos_x: c[0], cos_y: c[1], cos_z: c[2] };
  },
  "/vector/projection": (d) => {
    const a = toVec(d.a), b = toVec(d.b);
    return { scalar: a.scalarProjectionOn(b), vector: vecOut(a.vectorProjectionOn(b)) };
  },

  /* ---------- POINT ---------- */
  "/point/distance": (d) => ({ distance: toPt(d.a).distanceTo(toPt(d.b)) }),
  "/point/midpoint": (d) => ptOut(SolidGeometry.midpoint(toPt(d.a), toPt(d.b))),

  /* ---------- LINE ---------- */
  "/line/from-two-points": (d) => {
    const line = Line.fromTwoPoints(toPt(d.a), toPt(d.b));
    return { point: ptOut(line.point), direction: vecOut(line.direction) };
  },
  "/line/distance-from-point": (d) => ({ distance: toLine(d.line).distanceToPoint(toPt(d.point)) }),
  "/line/project-point":       (d) => ptOut(toLine(d.line).projectPoint(toPt(d.point))),
  "/line/relative": (d) => ({
    relation: SolidGeometry.relativePositionLines(toLine(d.l1), toLine(d.l2)),
  }),
  "/line/distance-between": (d) => {
    const l1 = toLine(d.l1), l2 = toLine(d.l2);
    const rel = SolidGeometry.relativePositionLines(l1, l2);
    if (rel === "parallel") return { relation: rel, distance: SolidGeometry.distanceParallelLines(l1, l2) };
    if (rel === "skew")     return { relation: rel, distance: SolidGeometry.distanceSkewLines(l1, l2) };
    return { relation: rel, distance: 0.0 };
  },
  "/line/angle": (d) => {
    const l1 = toLine(d.l1), l2 = toLine(d.l2);
    return { radians: l1.angleWithLine(l2), degrees: l1.angleWithLine(l2, true) };
  },
  "/line/angle-with-plane": (d) => {
    const line = toLine(d.line), plane = toPlane(d.plane);
    return { radians: line.angleWithPlane(plane), degrees: line.angleWithPlane(plane, true) };
  },

  /* ---------- PLANE ---------- */
  "/plane/from-three-points": (d) => {
    const plane = Plane.fromThreePoints(toPt(d.a), toPt(d.b), toPt(d.c));
    return { normal: vecOut(plane.normal), d: plane.d };
  },
  "/plane/distance-from-point": (d) => ({ distance: toPlane(d.plane).distanceToPoint(toPt(d.point)) }),
  "/plane/project-point":       (d) => ptOut(toPlane(d.plane).projectPoint(toPt(d.point))),
  "/plane/point-position": (d) => ({
    relation: SolidGeometry.relativePositionPointPlane(toPt(d.point), toPlane(d.plane)),
  }),
  "/plane/relative": (d) => ({
    relation: SolidGeometry.relativePositionPlanes(toPlane(d.p1), toPlane(d.p2)),
  }),
  "/plane/angle": (d) => {
    const p1 = toPlane(d.p1), p2 = toPlane(d.p2);
    return { radians: p1.angleWithPlane(p2), degrees: p1.angleWithPlane(p2, true) };
  },
  "/plane/intersect-line": (d) => ptOut(toPlane(d.plane).intersectLine(toLine(d.line))),
  "/plane/intersect-plane": (d) => {
    const line = toPlane(d.p1).intersectPlane(toPlane(d.p2));
    return { point: ptOut(line.point), direction: vecOut(line.direction) };
  },
  "/plane/line-relative": (d) => ({
    relation: SolidGeometry.relativePositionLinePlane(toLine(d.line), toPlane(d.plane)),
  }),

  /* ---------- AREA ---------- */
  "/area/triangle":      (d) => ({ area: SolidGeometry.areaTriangle(toPt(d.a), toPt(d.b), toPt(d.c)) }),
  "/area/parallelogram": (d) => ({ area: SolidGeometry.areaParallelogram(toPt(d.a), toPt(d.b), toPt(d.c)) }),
  "/area/quadrilateral": (d) => ({
    area: SolidGeometry.areaQuadrilateral(toPt(d.a), toPt(d.b), toPt(d.c), toPt(d.d)),
  }),
};