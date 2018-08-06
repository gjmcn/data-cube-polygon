{
  'use strict';
  
  const {
    assert, def, addArrayGetter, copyKey, copyLabel, toArray
  } = Array.prototype._helper;
  
  
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
    return def(assert.single(tol), 1e-10);
  };
  
  //vertices -> num, for simple (non-intersecting) polygon
  const signedArea = v => {
    const [x, y] = v.wrap(0, 'array');
    if (!isClosed(v)) {
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
  
  //vertices[, num] -> bool
  const isClosed = (v, tol) => {
    tol = getTol(tol);
    const nr = v._s[0];
    return euc(v[0], v[nr], v[nr-1], v[2*nr - 1]) <= tol;
  };
  
  //vertices -> array
  const segLength = v => {
    return v.rowSlice(1, -1, 'core')
            .sub(v.rowSlice(0, -2, 'core'))
            .pow(2).sum(1).sqrt().toArray();
  };
  
  //vertices -> array
  const arcLength = v => {
    const z = segLength(v);
    z.unshift(0);
    return z.cumuSum().toArray();
  };
  
  //points -> bool
  const checkPoints = pt => {
   if ( !pt._data_cube  ||
         pt._s[1] !== 2 ||
         pt._s[2] !== 1
      ) throw Error('invalid points');
  };
  

  //---------- polygon class ----------//

  class Polygon {
    
    constructor(p) {
      if ( !p._data_cube ||
           p._s[0] < 2 ||
           p._s[1] !== 2 ||
           p._s[2] !== 1 ||
           p._k ||
           p._l
        ) throw Error('invalid polygon');
      this.p = p;
    }
    
    //-> bool
    isClosed(tol) {
      return isClosed(this.p, tol);
    }

    //[num] -> cube (polygon, but not a polygon object)
    close(tol) {
      const p = this.p; 
      return isClosed(p, tol) ? p.copy('core') : p.vert(p.head(1));
    }

    //-> num
    area() {
      return Math.abs(signedArea(this.p));
    }
  
    //-> cube (1-by-2)
    centroid() {
      const p = this.p;
      const [x, y] = p.wrap(0, 'array');
      if (!isClosed(p)) {
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
      const div = 6 * signedArea(p);
      return [xc / div, yc / div].$shape(1);
    }

    //-> array
    segLength() {
      return segLength(this.p);
    }
    
    //-> array
    arcLength() {
      return arcLength(this.p);
    }
    
    //-> num
    length() {
      return segLength(this.p).sum()[0];  
    }
        
    //*[, num] -> cube
    atArcLength(s, scale) {
      s = toArray(s).arrange('asc');
      scale = assert.single(scale);
      const p = this.p,
            nr = p._s[0],
            [x, y] = p.wrap(0, 'array'),
            seg = segLength(p);
      seg.unshift(0);
      const arc = seg.cumuSum(),
            len = arc.at(-1),
            ns = s.length,
            q = [ns, 2].cube();
      if (scale) s = s.mul(len / scale);
      let upto = 0;
      for (let i=0; i<ns; i++) {
        while (1) {
          if (s[i] <= arc[upto + 1]) {
            let interp = (s[i] - arc[upto])/seg[upto + 1];
            q[i]      = x[upto]*(1 - interp) + x[upto + 1]*interp;
            q[i + ns] = y[upto]*(1 - interp) + y[upto + 1]*interp;
            break;  
          }
          if (++upto === nr - 1) throw Error('invalid arc length');
        }
      }
      return q;
    }
    
    //[num, bool] -> cube (polygon, but not a polygon object)
    simplify(epsilon, rel) {
      epsilon = def(assert.single(epsilon), 1);
      rel = def(assert.single(rel), true);
      const p = this.p,
            s = require('./simplify.js');
      if (rel) epsilon *= segLength(p).mean()[0];
      return s(p.arAr(), epsilon).matrix();
    }
    
    //[num] -> cube (polygon, but not a polygon object)
    smooth(iter, tol) {
      iter = assert.posInt(+def(assert.single(iter), 1));
      const p = this.p,
            clsd = isClosed(p, tol);
      let nOld = p._s[0],
          zOld = p,
          n,
          z;
      for (let s=0; s<iter; s++) {
        n = 2*(nOld - 1);
        if (clsd) n++;
        z = [n,2].cube();
        for (let i=0; i<nOld-1; i++) {
          const x0 = zOld[i],
                x1 = zOld[i + 1],
                y0 = zOld[i + nOld],
                y1 = zOld[i + 1 + nOld];
          z[2*i]         = 0.75*x0 + 0.25*x1;
          z[2*i + 1]     = 0.25*x0 + 0.75*x1;
          z[2*i + n]     = 0.75*y0 + 0.25*y1;
          z[2*i + 1 + n] = 0.25*y0 + 0.75*y1;
        }
        if (clsd) {
          z[n - 1]   = z[0];
          z[2*n - 1] = z[n];
        }
        nOld = n;
        zOld = z;
      }
      return z;
    }
      
    //cube[, bool] -> cube/array
    distance(test, retPt) {
      checkPoints(test);
      retPt = assert.single(retPt);
      const p = this.p,
            np = p._s[0],
            nt = test._s[0],
            seg = segLength(p),
            zDist = [nt].cube(),
            zPt = retPt ? [nt,2].cube() : null;
      let dist, 
          newPt = new Array(2);
      const update = (d, x, y) => {
        if (d < dist) {
          dist = d;
          if (retPt) {
            newPt[0] = x;
            newPt[1] = y;
          }
        }
      };
      for (let t=0; t<nt; t++) {
        const x = test[t],
              y = test[t + nt];
        dist = Infinity;
        newPt[0] = undefined;
        newPt[1] = undefined;
        for (let i=1; i<np; i++) {
          const x1 = p[i - 1],
                x2 = p[i],
                y1 = p[i - 1 + np],
                y2 = p[i + np],
                len = seg[i-1],
                proj = ((x - x1)*(x2 - x1) + (y - y1)*(y2 - y1)) / len;
          if (proj < 0 || proj > len) {  //projection misses, use closest end point
            const d1 = euc(x, y, x1, y1),
                  d2 = euc(x, y, x2, y2);
            d1 < d2 ? update(d1, x1, y1) : update(d2, x2, y2);
          }
          else {  //use projection
            const interp = proj / len,
                  xTmp = x1 + interp*(x2 - x1),
                  yTmp = y1 + interp*(y2 - y1),
                  d = euc(x, y, xTmp, yTmp); 
            update(d, xTmp, yTmp);
          }
        }
        zDist[t] = dist;
        if (retPt) {
          zPt[t] = newPt[0];
          zPt[t + nt] = newPt[1];        
        }
      }
      copyKey(test, zDist, 1);
      copyLabel(test, zDist, 1);
      if (retPt) {
        copyKey(test, zPt);
        copyLabel(test, zPt);
        return [zDist, zPt];
      }
      return zDist;
    }
    
    //cube -> cube (vector)
    contain(test) {
      checkPoints(test);
      const p = this.p,
            np = p._s[0],
            nt = test._s[0],
            z = [nt].cube();
      //following adapted from:  https://github.com/substack/point-in-polygon
      for (let k=0; k<nt; k++) {
        let x = test[k],
            y = test[k + nt],
            inside = false;
        for (let i=0, j=np-1; i<np; j=i++) {
          let xi = p[i],
              yi = p[i + np],
              xj = p[j],
              yj = p[j + np],
              intersect = ((yi > y) != (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
          if (intersect) inside = !inside;
        }
        z[k] = inside;
      }
      copyKey(test, z, 1);
      copyLabel(test, z, 1);
      return z;
    }
     
  }
 
  addArrayGetter('poly', function() {
    return new Polygon(this);
  });
  
}
