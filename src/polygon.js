(() => {
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
    
  //vertices -> num, for simple (non-self-intersecting) polygon
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
  
  //vertices -> bool
  const isClosed = v => {
    const nr = v._s[0];
    return euc(v[0], v[nr], v[nr-1], v[2*nr - 1]) < 1e-10;
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
  
  //-> func
  const simplify_js = require('./simplify.js');


  //---------- polygon class ----------//

  class Polygon {
    
    constructor(p) {
      if ( !p._data_cube ||
           p._s[0] < 2   ||
           p._s[1] !== 2 ||
           p._s[2] !== 1 ||
           p._k          ||
           p._l
        ) throw Error('invalid polygon');
      this.p = p;
    }
        
    //-> bool
    isClosed() {
      return isClosed(this.p);
    }

    //-> cube (polygon - not a polygon object)
    close() {
      const p = this.p; 
      return isClosed(p) ? p.copy('core') : p.vert(p.row(0));
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
          yc = 0,
          a = 0;
      for (let i=0; i<n-1; i++) {
        const mult = x[i] * y[i+1] - x[i+1] * y[i];
        xc += (x[i] + x[i+1]) * mult;
        yc += (y[i] + y[i+1]) * mult;
        a += x[i] * y[i+1] - x[i+1] * y[i];
      }
      const mult = 1 / (a * 3);
      return [xc * mult, yc * mult].$shape(1);
    }
    
    //-> array
    segLength() {
      return segLength(this.p);
    }
    
    //-> num
    length() {
      return segLength(this.p).sum()[0];  
    }
    
    //-> array
    arcLength() {
      return arcLength(this.p);
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
      s = s.gof(0).lof(len);      
      let upto = 0;
      for (let i=0; i<ns; i++) {
        while (1) {
          if (s[i] <= arc[upto + 1]) {
            let interp =  //0 if falsy in case NaN from repeated vertices at start of polygon
                  (s[i] - arc[upto])/seg[upto + 1] || 0;  
            q[i]      = x[upto]*(1 - interp) + x[upto + 1]*interp;
            q[i + ns] = y[upto]*(1 - interp) + y[upto + 1]*interp;
            break;  
          }
          if (++upto === nr - 1) throw Error('invalid polygon or arc length');
        }
      }
      return q;
    }
    
    //[num, bool, bool] -> cube (polygon - not a polygon object)
    simplify(epsilon, rel, high) {
      epsilon = def(assert.single(epsilon), 1);
      rel = def(assert.single(rel), true);
      high = !!assert.single(high);
      const p = this.p;
      if (rel) epsilon *= segLength(p).mean()[0];
      return simplify_js(p.arAr(), epsilon, high).matrix();
    }
    
    //[num] -> cube (polygon - not a polygon object)
    smooth(iter) {
      iter = assert.posInt(+def(assert.single(iter), 1));
      const p = this.p,
            clsd = isClosed(p);
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
    
    //cube -> cube (vector)
    contain(test) {
      checkPoints(test);
      const p = this.p,
            np = p._s[0],
            nt = test._s[0],
            z = [nt].cube();
      //following adapted from:
      //  https://github.com/substack/point-in-polygon
      //  The MIT License (MIT)
      //  Copyright (c) 2016 James Halliday
      for (let k=0; k<nt; k++) {
        const x = test[k],
              y = test[k + nt];
        let inside = false;
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
      let dist, xProj, yProj;
      const update = (d, x, y) => {
        if (d < dist) {
          dist = d;
          if (retPt) {
            xProj = x;
            yProj = y;
          }
        }
      };
      for (let t=0; t<nt; t++) {
        const x = test[t],
              y = test[t + nt];
        dist = Infinity;
        xProj = undefined;
        yProj = undefined;
        for (let i=1; i<np; i++) {
          const x1 = p[i - 1],
                x2 = p[i],
                y1 = p[i - 1 + np],
                y2 = p[i + np],
                len = seg[i-1],
                proj = ((x - x1)*(x2 - x1) + (y - y1)*(y2 - y1)) / len;
          if (proj <= 0) {  //use start point of segment
            update(euc(x, y, x1, y1), x1, y1);
          }
          else if (proj >= len) {  //use end point of segment
            update(euc(x, y, x2, y2), x2, y2); 
          }
          else {  //use projection
            const interp = proj / len,
                  xTmp = x1 + interp*(x2 - x1),
                  yTmp = y1 + interp*(y2 - y1); 
            update(euc(x, y, xTmp, yTmp), xTmp, yTmp);
          }
        }
        zDist[t] = dist;
        if (retPt) {
          zPt[t] = xProj;
          zPt[t + nt] = yProj;        
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
         
  }
 
  addArrayGetter('poly', function() {
    return new Polygon(this);
  });
  
})();