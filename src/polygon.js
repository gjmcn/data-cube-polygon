{
  'use strict';
  
  const polygon = {};
  const assert = Array.prototype._helper.assert;
  
  
  //---------- helper functions ----------//
  
  //num, num, num, num -> num 
  const euc = (xa, ya, xb, yb) => {
    return Math.sqrt(
      Math.pow(xb - xa, 2) + 
      Math.pow(yb - ya, 2)
    );
  };
  
  //[num] -> num
  const getTol = tol => {
    return def(assert.single(tol), 1e-8);
  };
  
  //poly -> num, for simple (non-intersecting) polygon
  const signedArea = p => {
    const [x, y] = p.wrap();
    if (!polygon.isClosed(p)) {
      x.push(x[0]);
      y.push(y[0]);
    }
    const n = x.length;
    let a = 0;
    for (let i=0; i<n-1; i++) {
      a += x[i] * y[i+1] - x[i+1] * y[i];
    }
    return a / 2;
  };
  
  //---------- exported functions ----------//
  
  const polygon = {
  
    // * -> bool
    isPolygon(p) {
      return p._data_cube &&
        p._s[0] > 1 &&
        p._s[1] === 2 &&
        p._s[2] === 1 &&
        p.isFinite().all(-1)[0];
    },

    // poly[, num] -> bool
    isClosed(p, tol) {
      tol = getTol(tol);
      const last = p._s(0) - 1;
      return euc(p[last], p[0], p[2 * last], p[last + 1]) <= tol;
    },

    // poly[, num] -> poly (new)
    close(p, tol) {
      if (polygon.isClosed(p)) return p.copy();
      return p.vert(p.head(1));
    },

    //poly -> num
    polygon.area(p) {
      return Math.abs(signedArea(p));
    },
  
    //poly -> 1-by-2 cube
    centroid(p) {
      const [x, y] = p.wrap();
      if (!polygon.isClosed(p)) {
        x.push(x[0]);
        y.push(y[0]);
      }
      const n = x.length;
      let xc = 0,
          yc = 0;
      for (let i=0; i<n-1; i++) {
        let mult = x[i] * y[i+1] - x[i+1] * y[i];
        xc += (x[i] + x[i+1]) * mult;
        yc += (y[i] + y[i+1]) * mult;
      }
      const div = 6 * polygon.area(p);
      return [xc / div, yc / div].$shape(1);
    }

  } 
  
  module.exports = polygon;
}