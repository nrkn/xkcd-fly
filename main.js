var canvas,
    block,
    blockCtx,
    stage,
    fps = 60,
    sprite,    
    spriteSheet,
    player,
    key = {
      up: 38,
      left: 37,
      right: 39,
      down: 40,
      w: 87,
      a: 65,
      d: 68,
      s: 83
    },
    commands = {
      up: false,
      left: false,
      right: false,
      down: false
    },
    facing = '',
    position = {
      x: 145,
      y: -836
    },    
    tileSize = 2048,
    blockSize = 128,
    cache,
    debug,
    size,
    blockmap,
    blockContainer,
    blockTileSize,
    tiles = {},
    neighbours = [
      { x: 0, y: -1 },
      { x: 1, y: -1 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
      { x: -1, y: 1 },
      { x: -1, y: 0 },
      { x: -1, y: -1 }
    ],
    flying = false,
    mousing = false,
    velocity = 5,
    mouseLocation = {
      x: 0,
      y: 0
    },
    playerCollisionBox,
    debugMode = false;
        
function init(){  
  canvas = document.getElementById( "viewport" );
  cache = document.getElementById( "cache" );
  debug = document.getElementById( "debug" );

  size = {
    width: canvas.width,
    height: canvas.height
  };
  
  block = document.getElementById( "block" );
  if( debugMode ) {
    block.style.display = 'block';
  }
  blockTileSize = tileSize / blockSize;
  block.width = Math.ceil( size.width / blockTileSize );
  block.height = Math.ceil( size.height / blockTileSize );
  blockCtx = block.getContext( '2d' );
    
  
  blockmap = getOrLoadImage( 'blockmap', function(){
    sprite = new Image();  
    sprite.onload = start;
    sprite.src = "sprite.png";  
  });
}

function log( message ) {
  debug.innerHTML = debug.innerHTML + "\r\n" + message;
}

function clearLog() {
  debug.innerHTML = '';
}

function start(){
  stage = new createjs.Stage( canvas );
  
  spriteSheet = new createjs.SpriteSheet({
    images: [ sprite ],
    frames: {
      width: 76,
      height: 59,
      regX: 59,
      regY: 6
    },
    animations: {
      idle: [ 0, 0, "idle" ],
      start: {
        frames: [ 0, 1, 2 ],
        next: false,
        frequency: 2
      },
      end: {
        frames: [ 2, 1, 3, 0 ],
        next: false,
        frequency: 2
      }
    }
  });
  
  createjs.SpriteSheetUtils.addFlippedFrames( spriteSheet, true, false, false );
  
  player = new createjs.BitmapAnimation( spriteSheet );
  player.gotoAndPlay( "idle" );
  player.x = canvas.width / 2;
  player.y = canvas.height / 2; 
  player.currentFrame = 0;
  
  initTiles([ 'tl', 'tr', 'bl', 'br' ]);
    
  stage.addChild( player );

  blockContainer = new createjs.Container();
  stage.addChild( blockContainer );

  createjs.Ticker.addListener( window );
  createjs.Ticker.useRAF = true;
  createjs.Ticker.setFPS( fps );  
  
  document.onkeydown = keydown;
  document.onkeyup = keyup;
  canvas.onmousedown = mousedown;
  canvas.onmouseup = mousestop;
  canvas.onmouseout = mousestop;
}

function initTiles( names ) {
  var id = 'n';
  for( var i = 0; i < names.length; i++ ) {
    var name = names[ i ];
    tiles[ name ] = new createjs.Bitmap( getOrLoadImage( id ) );
    tiles[ name ].name = id;
    stage.addChild( tiles[ name ] );
  }
}

function getCenter() {
  return {
    x: size.width / 2,
    y: size.height / 2
  };
}

function setMouseCommands() {
  var center = getCenter();
  
  if( mouseLocation.x < center.x ) {
    move( 'left' );
  }
  
  if( mouseLocation.x > center.x ) {
    move( 'right' );
  }
  
  if( mouseLocation.y < center.y ) {
    move( 'up' );
  }
    
  if( mouseLocation.y > center.y ) {
    move( 'down' );
  }
}

function executeCommands() {
  if( commands.left ) {
    position.x--;
  }
  if( commands.right ) {
    position.x++;
  }  
  if( commands.up ) {
    position.y--;
  } 
  if( commands.down ) {
    position.y++;
  }  
  
  var rects;
  if( debugMode ) {
    rects = getBlockData({
      left: position.x - ( size.width / 2 ),
      top: position.y - ( size.height / 2 ),
      width: size.width,
      height: size.height
    });  
  } else {
    var blockRadius = 12;  
    rects = getBlockData({
      left: position.x - blockTileSize * ( blockRadius / 2 ),
      top: position.y - blockTileSize * ( blockRadius / 2 ),
      width: blockTileSize * blockRadius,
      height: blockTileSize * blockRadius
    });   
  }
  
  //doesn't yet take into account animation frame
  var playerRect = {
    left: ( size.width / 2 ) - ( facing == '' ? 0 : 8 ),
    top: ( size.height / 2 ) + 18,
    width: 8,
    height: 24
  };
  
  if( debugMode && playerCollisionBox ) {
    stage.removeChild( playerCollisionBox );
  }
  if( debugMode ) {
    var g = new createjs.Graphics();
    g.beginFill("rgba( 0, 0, 255, 0.5 )").drawRect( playerRect.left, playerRect.top, playerRect.width, playerRect.height );
    playerCollisionBox = new createjs.Shape( g );    
    stage.addChild( playerCollisionBox );
  }    
  
  if( blocks( playerRect, rects ) ) {    
    if( commands.left ) {
      position.x++;
    }
    if( commands.right ) {
      position.x--;
    }  
    if( commands.up ) {
      position.y++;
    } 
    if( commands.down ) {
      position.y--;
    }   
  }
}

function tick() {
  if( mousing ) {
    setMouseCommands();
  }
  
  for( var i = 0; i < velocity; i++ ) {
    executeCommands();
  }  
  
  updateBackgrounds();
  stage.update();  
}

function blocks( playerRect, rects ) {
  for( var i = 0; i < rects.length; i++ ) {
    if( rectsIntersect( rects[ i ], playerRect ) ) return true;
  }
  return false;
}

function rectsIntersect( r1, r2 ) {
  return !(r2.left > r1.left + r1.width || 
           r2.left + r2.width < r1.left || 
           r2.top > r1.top + r1.height ||
           r2.top + r2.height < r1.top);
}

function move( direction ) {
  facing = direction == 'right' ? '' : direction == 'left' ? '_h' : facing;
    
  if( direction == 'left' ) {
    commands.right = false;
  }
  if( direction == 'right' ) {
    commands.left = false;
  }
    
  if( ( commands.left == false && direction == 'left' ) || commands.right == false && direction == 'right' ) {
    player.gotoAndPlay( 'start' + facing );
    flying = true;
  } 
  
  commands[ direction ] = true;
}

function stop( direction ) {
  facing = direction == 'right' ? '' : direction == 'left' ? '_h' : facing;
  
  if( ( commands.left && direction == 'left' ) || commands.right && direction == 'right' ) {
    player.gotoAndPlay( 'end' + facing );
    flying = false;
  }   

  commands[ direction ] = false;
}

function setMouseLocation( e ) {
  mouseLocation = {
    x: e.clientX,
    y: e.clientY
  };  
}

function mousemove( e ) {
  if( !mousing ) return;
  
  e = e || window.event;
  setMouseLocation( e );
}

function mousedown( e ) {
  e = e || window.event;
  mousing = true;
  setMouseLocation( e );
}

function mousestop( e ) {
  if( !mousing ) return;
  
  mousing = false;
  
  var center = getCenter();
  
  if( mouseLocation.x < center.x ) {
    stop( 'left' );
  }
  
  if( mouseLocation.x > center.x ) {
    stop( 'right' );
  }
  
  if( mouseLocation.y < center.y ) {
    stop( 'up' );
  }
  
  if( mouseLocation.y > center.y ) {
    stop( 'down' );
  }    
}

function keydown( e ) {
  e = e || window.event;
  
  switch( e.keyCode ) {
    case key.a:
    case key.left:
      move( "left" );
      break;
    case key.d:
    case key.right:
      move( "right" );
      break;
    case key.w:
    case key.up:
      move( "up" );
      break;
    case key.s:
    case key.down:
      move( "down" );
      break;
  }
  
  return false;
}

function keyup( e ) {
  e = e || window.event;
  
  switch( e.keyCode ) {
    case key.a:
    case key.left:
      stop( "left" );
      break;
    case key.d:
    case key.right:
      stop( "right" );
      break;
    case key.w:
    case key.up:
      stop( "up" );
      break;
    case key.s:
    case key.down:
      stop( "down" );
      break;
  }
  
  return false;
}

function pointToId( point ) {
  var x = point.x + ( point.x >= 0 ? 1 : 0 ),
      y = point.y + ( point.y >= 0 ? 1 : 0 ),
      dx = x < 0 ? 'w' : 'e',
      dy = y < 0 ? 'n' : 's';
      
  return Math.abs( y ) + dy + Math.abs( x ) + dx;
}

function locationToPoint( location ) {
  return {
    x: Math.floor( location.x / tileSize ),
    y: Math.floor( location.y / tileSize )
  };
}

function getOrLoadImage( id, callback ) {
  var prefix = 'tile',
      path = 'tiles/';
  
  var imageId = prefix + id,
      image = document.getElementById( imageId );
  if( !image ) {
    image = new Image();
    image.id = imageId;
    cache.appendChild( image );
    
    image.onload = callback || function(){};
    
    image.onerror = function() {
      image.src = getOrLoadImage( id.charAt( 1 ) ).src;
    }
    
    image.src = path + id + '.png';
  }
  return image;
}

function tileData( location ) {
  var point = locationToPoint( location ),
      id = pointToId( point ),
      location = {
        x: point.x * tileSize,
        y: point.y * tileSize
      };
  
  location = offsetByViewportCenter( location );
  location = offsetByPosition( location );
  
  return {
    id: id,
    location: location
  };
}

function offsetByViewportCenter( point ) {
  return {
    x: point.x + size.width / 2,
    y: point.y + size.height / 2
  };
}

function offsetByPosition( point ) {
  return {
    x: point.x - position.x,
    y: point.y - position.y
  };
}

function getBlockData( rectangle ) {
  var tileOffset = {
        x: -33,
        y: -14
      },
      sourcePoint = {
        x: Math.floor( rectangle.left / blockTileSize - ( tileOffset.x * blockSize ) ),
        y: Math.floor( rectangle.top / blockTileSize - ( tileOffset.y * blockSize ) )
      },
      mod = {
        x: rectangle.left % blockTileSize,
        y: rectangle.top % blockTileSize
      }, 
      containerOffset = {},  
      scaledSize = {
        width: Math.floor( rectangle.width / blockTileSize ),
        height: Math.floor( rectangle.height / blockTileSize )
      },
      stagePosition = {
        x: position.x - ( size.width / 2 ),
        y: position.y - ( size.height / 2 )
      },
      offsetToStage = {
        x: rectangle.left - stagePosition.x,
        y: rectangle.top - stagePosition.y
      },
      rects = [];
  
  if( mod.x < 0 ){
    containerOffset.x = ( blockTileSize * -1 ) + Math.abs( mod.x );
  } else {
    containerOffset.x = 0 - mod.x;
  }
  
  if( mod.y < 0 ){
    containerOffset.y = ( blockTileSize * -1 ) + Math.abs( mod.y );
  } else {
    containerOffset.y = 0 - mod.y;
  }

  blockCtx.drawImage( blockmap, sourcePoint.x, sourcePoint.y, scaledSize.width, scaledSize.height, 0, 0, scaledSize.width, scaledSize.height );
  
  if( debugMode ) {
    blockContainer.removeAllChildren();
  }
  
  var imageData = blockCtx.getImageData( 0, 0, scaledSize.width, scaledSize.height );
      
  for( var y = 0; y < imageData.height; y++ ){
    for( var x = 0; x < imageData.width; x++ ) {
      var dataOffset = ( y * imageData.width + x ) * 4;
      if( imageData.data[ dataOffset ] == 0 ) {
        var rect = {
          left: x * blockTileSize + containerOffset.x + offsetToStage.x,
          top: y * blockTileSize + containerOffset.y + offsetToStage.y,
          width: blockTileSize,
          height: blockTileSize
        };
        rects.push( rect );
        if( debugMode ) {
          var g = new createjs.Graphics();
          g.beginFill("rgba( 255, 0, 0, 0.5 )").drawRect( rect.left, rect.top, rect.width, rect.height );
          var s = new createjs.Shape( g );
          blockContainer.addChild( s );        
        }
      }
    }
  }
  
  //rects are relative to the stage
  return rects;
}

function updateTile( name, location ) {
  var data = tileData( location );
  
  //preload neighbours
  for( var i = 0; i < neighbours.length; i++ ) {
    var neighbour = neighbours[ i ],
        point = locationToPoint( location );
        id = pointToId({
          x: point.x + neighbour.x,
          y: point.y + neighbour.y
        });
    getOrLoadImage( id );
  }
  
  if( data.id != tiles[ name ].name ) {
    tiles[ name ].image = getOrLoadImage( data.id );
    tiles[ name ].name = data.id;
  }
  
  tiles[ name ].x = data.location.x;
  tiles[ name ].y = data.location.y;
}

function updateBackgrounds() {
  updateTile( 'tl', {
    x: position.x - ( size.width / 2 ),
    y: position.y - ( size.height / 2 )
  });
  
  updateTile( 'tr', {
    x: position.x + ( size.width / 2 ),
    y: position.y - ( size.height / 2 )
  });
  
  updateTile( 'bl', {
    x: position.x - ( size.width / 2 ),
    y: position.y + ( size.height / 2 )
  });
  
  updateTile( 'br', {
    x: position.x + ( size.width / 2 ),
    y: position.y + ( size.height / 2 )
  });
}