const express = require('express');
const app = express();
const http = require('http').Server(app);
const fs = require('fs');
const path = require('path');
const io = require('socket.io')(http);
const webshot = require('webshot');
const videoshow = require('videoshow');

const webshotOptions = {
  screenSize: {
    width: 1920, 
    height: 1080
  }, 
  shotSize: {
    width: 'window',
    height: 'window'
  },
  siteType:'html',
  quality:'30'
}

const videoOptions = {
  fps: 60,
  loop: 0.25, // seconds
  transition: false,
  transitionDuration: 0, // seconds
  videoBitrate: 1024,
  videoCodec: 'libx264',
  size: '640x?',
  audioBitrate: '128k',
  audioChannels: 2,
  format: 'mp4',
  pixelFormat: 'yuv420p'
}

const getImages = srcpath => {
  return fs.readdirSync(srcpath)
    .map(file => file.replace(".png",""))
    .sort((a,b) => a - b )
    .map(file => srcpath+'/'+file+".png");
}

app.use(express.static(path.join(__dirname, '/')));
app.use('/bower_components',  express.static( path.join(__dirname, '/bower_components')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname + '/index.html'));
});

io.on('connection', (socket) => {
  console.log('a user connected');
  let userObject = null;

  socket.on("new user", (user) => { userObject = {id:user.id,imageIndex:0,html:user.html}; })

  socket.on('new image', (obj) => {

      if(!userObject)
        userObject = {id:user.id,imageIndex:0,html:user.html};
        
      webshot(obj.html, 'generatedImages/'+obj.id+'/'+(userObject.imageIndex)+'.png', webshotOptions, (err) => {
        userObject.imageIndex++; 
      });
  });


  socket.on('disconnect', () => {
    console.log('user disconnected');
    if(userObject && userObject.id && fs.existsSync("generatedImages/"+userObject.id)) {
      const imgArray = getImages("generatedImages/"+userObject.id) || [];

      if(imgArray.length>0){
        videoshow(imgArray, videoOptions)
        .save('generatedVideos/'+userObject.id+'.mp4')
        .on('start', (command) => {
          console.log('ffmpeg process started:', command)
        })
        .on('error', (err, stdout, stderr) => {
          console.error('Error:', err)
          console.error('ffmpeg stderr:', stderr)
        })
        .on('end', (output) => {
          console.error('Video created in:', output)
        })
      }
    }
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});
