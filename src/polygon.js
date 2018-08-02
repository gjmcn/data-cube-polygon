{
  'use strict';
  
  const {
    assert, def, addArrayGetter
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
    if (!v.isClosed()) {
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
    const last = v._s[0] - 1;
    return euc(v[last], v[0], v[2 * last], v[last + 1]) <= tol;
  };
  
  //vertices -> array
  const segLength = v => {
    return v.rowSlice(1, -1, 'core')
            .sub(v.rowSlice(0, -2, 'core'))
            .pow(2).sum(1).sqrt().toArray();
  };
  
  //vertices -> array
  const arcLength = v => {
    return segLength(v).unshift(0).cumuSum().toArray();
  };
  
  //points -> bool
  const checkPoints = pt => {
   if ( !pt._data_cube ||
         p._s[1] !== 2 ||
         p._s[2] !== 1 ||
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
    
    //num[, num] -> cube (polygon, but not a polygon object)
    eqSpace(k, tol) {
      k = assert.posInt(assert.single(k));
      if (k < 2) throw Error('new number of points must be greater than 1');
      const p = this.p,
            clsd = isClosed(p, tol),
            nr = this._s[0],
            [x, y] = p.wrap(0, 'array'),
            seg = segLength(p),
            arc = seg.unshift(0).cumuSum(),
            len = arc.at(-1),
            q = [k, 2].cube(),
            [arc_k, step] = [0, len].lin(clsd ? k + 1 : k);
      if (clsd) arc_k.pop();
      let upto = 0;
      for (let i=0; i<k; k++) {
        while (upto < nr - 1) {
          if (arc_k[i] <= arc[upto + 1]) {
            let interp = (arc_k[i] - arc[upto])/seg[upto];
            q[i]     = x[upto]*(1 - interp) + x[upto + 1]*interp;
            q[i + k] = y[upto]*(1 - interp) + y[upto + 1]*interp;
            break;  
          }
          upto++;
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
    
    //cube -> vector
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
    
      CHECK AND TEST THIS!!!!!!!!
      
    /*
    function (point, vs) {

    var x = point[0], y = point[1];
    
    var inside = false;
    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        var xi = vs[i][0], yi = vs[i][1];
        var xj = vs[j][0], yj = vs[j][1];
        
        var intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    
    return inside;
    */
      
      
      
    }
    
    
    
    //KEEP THE row vectors of the pts
    
  }
  
  addArrayGetter('poly', function() {
    return new Polygon(this);
  });
  
  
      //inside, smooth, geojson, concave hull?, others...?
  
}


/*NOTES:

1) p does not copy the points - so changing them can invalidate the polygon objects
  -copy beforehand if nec:   x.copy().poly
2) .poly always checks input so store result of poly for performance
  -and so can write   eg   xp = x.poly;   xp.centroid();    xp.area() ...
    -though note that xp.add(100) will not work, normally convert and use each call, eg
      x.poly.centroid().add(100)
3) does not check values - eg that are finite numbers
4) use .p to get the points:    xp = x.poly;   x.p
5)eqSpace:
  -if closed, does not include end - last point is a 'step' beofre end
  -if not closed, does include end
6) simplify
  -no special provision for closed polygons
  -inefficient since  cube -> array-of-arrays -> simplify -> cube
7) contain: points can have extras - row and page extras are retained


*/





