{
  
  'use strict';
  const dc = require ('@gjmcn/data-cube'),
        assert = dc._assert,
        test = assert.test,
        h = Array.prototype._helper,
        _isEqual = require('lodash.isequal');

  require ('../dist/polygon.js');

  const rectangle = [0,1,1,0,0, 0,0,2,2,0].$shape(5),  //closed, clockwise
        triangle = [10,40,40, 20,60,20].$shape(3),     //open, counter-clockwise
        line = [-2,4, 10,-12].$shape(2);               //open

  console.log('\nTesting data-cube-polygon\n');


  //---------- isClosed ----------//

  {
    console.log('--- isClosed');

    assert('isClosed-rectangle',
           () => rectangle.poly.isClosed(),
           true);
    assert('isClosed-triangle',
           () => triangle.poly.isClosed(),
           false);
    assert('isClosed-line',
           () => line.poly.isClosed(),
           false);
  }

  //---------- close ----------//

  {
    console.log('--- close');

    test('close-rectangle',
          rectangle.poly.close(),
          rectangle);
    test('close-triangle',
           triangle.poly.close(),
           triangle.vert([10, 20].tp()));
    test('close-line',
         line.poly.close(),
         line.vert([-2, 10].tp()));
  }

  //---------- area ----------//

  {
    console.log('--- area');

    assert('area-rectangle',
           () => rectangle.poly.area(),
           2);
    assert('area-triangle',
           () => triangle.poly.area(),
           600);
    assert('area-line',
           () => line.poly.area(),
           0);
    assert('area-line-closed',
           () => line.poly.close().poly.area(),
           0);
  }

  //---------- centroid ----------//

  {
    console.log('--- centroid');

    test.approx('centroid-rectangle',
           rectangle.poly.centroid(),
           [0.5, 1].tp());
    test.approx('centroid-triangle',
           triangle.poly.centroid(),
           [30, 100/3].tp());
    test('centroid-line-0',
           line.poly.centroid().shape(),
           [1,2,1]);
    test('centroid-line-1',
           line.poly.centroid().isNaN(),
           [true, true].tp());
  }

  //---------- segLength, length ----------//
  
  {
    console.log('--- segLength, length');

    HERE!!!!!!!!!!!111
      save length of line and use in both!!!!!!!!!!!!!!
    
    test('segLength-rectangle',
           rectangle.poly.segLength(),
           [1,2,1,2]);
    test('segLength-triangle-0',
           triangle.poly.segLength(),
           [50,40]);
    test('segLength-triangle-1',
           triangle.poly.close().poly.segLength(),
           [50,40,30]);

    assert('length-rectangle',
           () => rectangle.poly.length(),
           6);
    assert('length-triangle',
           () => triangle.poly.length(),
           120);
    assert('length-line',
           () => line.poly.length(),
           [6, 22].pow(2).add().sqrt()[0]);
    assert('length-line-closed',
           () => line.poly.close().poly.area(),
           0);

  //---------- arcLength ----------//


  //---------- atArcLength ----------//


  
  ????use test.approx for more of the tests?
  ????all args covered?
  
  
  
  //---------- simplify ----------//


  //---------- smooth ----------//


  //---------- distance ----------//


  //---------- contain ----------//


  console.log('\nTests finished\n');

}