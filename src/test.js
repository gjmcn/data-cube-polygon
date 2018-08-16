
const assert = require('@gjmcn/data-cube-assert');
const _isEqual = require('lodash.isequal');
const require ('@gjmcn/data-cube');

???????HOW SHOULD ENSURE THAT DATA-CUBE THERE FOR TESTS? - SINCE
NPM DOES NOT AUTOINSTALL PEER-DEPS?


const require ('./dist/polygon.js');

const square = [0,1,1,0,0, 0,0,1,1,0].$shape(5),  //closed
      triangle = [10,40,40, 20,20,60].$shape(3),  //open
      line = [-2,4, 10,-12].$shape(2);            //open

console.log('Testing data-cube-polygon');


//---------- isClosed ----------//

console.log('--- isClosed');

assert('isClosed-square',
       () => square.poly.isClosed(),
       true);
assert('isClosed-triangle',
       () => triangle.poly.isClosed(),
       false);
assert('isClosed-line',
       () => line.poly.isClosed(),
       false);






//---------- close ----------//


//---------- area ----------//


//---------- centroid ----------//


//---------- segLength ----------//


//---------- length ----------//


//---------- arcLength ----------//


//---------- atArcLength ----------//


//---------- simplify ----------//


//---------- smooth ----------//


//---------- distance ----------//


//---------- contain ----------//



