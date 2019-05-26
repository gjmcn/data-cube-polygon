(() => {
  
  'use strict';
  
  const dc = require ('@gjmcn/data-cube'),
        assert = dc._assert,
        test = assert.test,
        h = Array.prototype._helper;

  require ('../dist/polygon.js');

  const rectangle = [0,1,1,0,0,0,0,2,2,0].$shape(5),  //closed, counter-clockwise
        triangle = [10,40,40,20,60,20].$shape(3),     //open, clockwise
        line = [-2,4,10,-12].$shape(2);               //open

  console.log('\nTesting data-cube-polygon\n');

  
  //---------- constructor ----------//
  
  {
    console.log('--- constructor');

    assert.throw('throw-constructor-not-cube',
                 () => [1,2,3,4].poly);
    assert.throw('throw-constructor-invalid-shape',
                 () => [1,2,3,4].toCube().poly);
    assert.throw('throw-constructor-keys',
                 () => [1,2,3,4].$shape(2).$key(0,['a','b']).poly); 
  }
  
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
           triangle.vert([10,20].tp()));
    test('close-line',
         line.poly.close(),
         line.vert([-2,10].tp()));
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
           [0.5,1].tp());
    test.approx('centroid-triangle',
           triangle.poly.centroid(),
           [30,100/3].tp());
    test.approx('centroid-triangle-closed',
           triangle.poly.close().poly.centroid(),
           [30,100/3].tp());
    test('centroid-line-0',
           line.poly.centroid().shape(),
           [1,2,1]);
    test('centroid-line-1',
           line.poly.centroid().isNaN(),
           [true, true].tp());
  }

  //---------- segLength, arcLength, length ----------//
  
  {
    console.log('--- segLength');

    const lineLen = Math.hypot(6,22);
    
    test('segLength-rectangle',
         rectangle.poly.segLength(),
         [1,2,1,2]);
    test('segLength-triangle-0',
         triangle.poly.segLength(),
         [50,40]);
    test('segLength-triangle-1',
         triangle.poly.close().poly.segLength(),
         [50,40,30]);
    test.approx('segLength-line-0',
         line.poly.segLength(),
         [lineLen]);
    test.approx('segLength-line-1',
         line.poly.close().poly.segLength(),
         [lineLen, lineLen]);
    
    console.log('--- arcLength');
    
    test('arcLength-rectangle',
         rectangle.poly.arcLength(),
         [0,1,3,4,6]);
    test('arcLength-triangle-0',
         triangle.poly.arcLength(),
         [0,50,90]);
    test('arcLength-triangle-1',
         triangle.poly.close().poly.arcLength(),
         [0,50,90,120]);
    test('arcLength-line-0',
         line.poly.arcLength(),
         [0,lineLen]);
    test('arcLength-line-1',
         line.poly.close().poly.arcLength(),
         [0, lineLen, 2*lineLen]);
    
    console.log('--- length');
    
    assert('length-rectangle',
           () => rectangle.poly.length(),
           6);
    assert('length-triangle-0',
           () => triangle.poly.length(),
           90);
    assert('length-triangle-1',
           () => triangle.poly.close().poly.length(),
           120);
    assert('length-line',
           () => line.poly.length(),
           lineLen);
    assert('length-line-closed',
           () => line.poly.close().poly.length(),
           2*lineLen);
    
  }

  //---------- atArcLength ----------//
  
  {
    console.log('--- atArcLength');

    test.approx('atArcLength-rectangle-0',
        rectangle.poly.atArcLength(4.75),
        [0,1.25].tp());
    test('atArcLength-rectangle-1',
        rectangle.poly.atArcLength([4,1]),  //reordered to [1,4]
        [1,0,0,2].$shape(2));
    test.approx('atArcLength-triangle',
        triangle.poly.atArcLength([10,20,30,40,50], 90),
        [0.2,0.4,0.6,0.8,1].tile(1).mul([30, 40].tp().tile(0,5))
          .add([10, 20].tp().tile(0,5)));
    test('atArcLength-line',
        line.poly.atArcLength([-1,0,1,2], 1),
        [-2,-2,4,4,10,10,-12,-12].$shape(4));
    test('atArcLength-repeated-vertices',
        [3,3,5,2,2,10].$shape(3).poly.atArcLength([0,0.5,1],1),
        [3,4,5,2,6,10].$shape(3));    
    assert.throw('throw-atArcLength-invalid-arc-length',
                () => rectangle.poly.atArcLength('a'));
  }

  //---------- smooth ----------//
  
  {
    console.log('--- smooth');

    test.approx('smooth-rectangle',
      rectangle.poly.smooth(),
      [0.25, 0.75, 1   , 1  , 0.75, 0.25, 0  , 0  , 0.25,
       0   , 0   , 0.5 , 1.5, 2   , 2   , 1.5, 0.5, 0]
        .$shape(9));
    test.approx('smooth-triangle-0',
      triangle.poly.smooth(1),
      [17.5, 32.5, 40, 40,
       30,   50  , 50, 30 ]
        .$shape(4));
    test.approx('smooth-triangle-1',
      triangle.poly.smooth(2),
      [21.25, 28.75, 34.375, 38.125, 40, 40,  
       35   , 45   , 50    , 50    , 45, 35 ]
        .$shape(6));
    test.approx('smooth-line-0',
      line.poly.smooth(),
      [-0.5,  2.5,
       4.5 , -6.5]
        .$shape(2));
  
  }


  //---------- contain ----------//
  
  {
    
    console.log('--- contain');
  
    const rTest = [
      0.5, 1.1, 0.5, 0.3, -0.5, 0.99, 1.01,
      1  , 1  , 2.1, 1.9,  2.5, 0.01, -0.01
    ].$shape(7);
    test('contain-rectangle',
         rectangle.poly.contain(rTest),
         [true, false, false, true, false, true, false]);
    
    const tTest = [
      25, 25, 25,   25,
      22, 18, 40.1, 39.9
    ].$shape(4);
    test('contain-triangle',
         triangle.poly.contain(tTest),
         [true, false, false, true]);

    const lTest = [
      -2.1, 1     , 4,
      10  , -1.001, -11.9
    ].$shape(3).$key(0, ['a','b','c']);
    test('contain-line',
         line.poly.contain(lTest),
         [false, false, false].$key(0, ['a','b','c']));
    
    assert.throw('throw-contain-invalid-points',
      () => rectangle.poly.contain([1,2,3,4].toCube()));

  }
    
  //---------- distance ----------//

  {
    console.log('--- distance');
    
    const rTest = [
      0.5, 1.1, 0.5, 0.3, -0.5, 0.99, 1.01,
      1  , 1  , 2.1, 1.9,  2.5, 0.01, -0.01
    ].$shape(7).$key(0, ['a','g'].seq()).$label(0, 'rows');
    test.approx(
      'distance-rectangle',
      rectangle.poly.distance(rTest),
      [0.5, 0.1, 0.1, 0.1, 1/Math.sqrt(2), 
       0.01, Math.hypot(0.01, 0.01)]
        .$key(0, ['a','g'].seq()).$label(0, 'rows'));
    
    const tTest = [
       0, 40, 50, 25, 21,
      20, 70, 10, 40, 43 
    ].$shape(5);
    const [tDist, tProj] = triangle.poly.distance(tTest, true);
    test.approx('distance-triangle-distance',
      tDist,
      [10, 10, 10*Math.sqrt(2), 0, 5]);
    test.approx('distance-triangle-projection',
      tProj,
      [
        10, 40, 40, 25, 25,
        20, 60, 20, 40, 40
      ].$shape(5));
    
    const lTest = [11 , 13 - 22/3].tp();    
    const [lDist, lProj] = line.poly.distance(lTest, true);    
    test.approx('distance-line-distance',
      lDist,
      [Math.hypot(11,3)]);
    test.approx('distance-line-projection',
      lProj,
      [0, 10 - 22/3].tp());
    
    assert.throw('throw-distance-invalid-points',
      () => rectangle.poly.distance([1,2,3,4].toCube()));
    
  }

  console.log('\nTests finished\n');

})();