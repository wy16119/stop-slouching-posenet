const audio = new Audio('warning.mp3')

drawPoint = (x, y, ctx) => {
  ctx.fillStyle = 'Cyan';
  ctx.fillRect(x, y, 5, 5)
}

drawLine = (point1, point2, ctx) => {
  if (!point1 || !point2) {
    return
  }

  ctx.beginPath()
  ctx.moveTo(point1.position.x, point1.position.y)
  ctx.lineTo(point2.position.x, point2.position.y)
  ctx.strokeStyle = 'Cyan'
  ctx.stroke()
}

findPart = (part, keypoints) => {
  return keypoints.find(point => point.part === part)
}

getDistance = (point1, point2) => {
  return Math.sqrt(Math.pow(point1.position.x - point2.position.x, 2)
    + Math.pow(point1.position.y - point2.position.y, 2))
}

checkNeck = (keypoints) => {
  const debug = document.getElementById('debug')

  const nose = findPart('nose', keypoints)
  const leftShoulder = findPart('leftShoulder', keypoints)
  const rightShoulder = findPart('rightShoulder', keypoints)

  if (!nose || !leftShoulder || !rightShoulder) {
    debug.innerHTML = 'Cannot find nose or shoudlers'
    return
  }

  const noseToLeftShoulder = getDistance(nose, leftShoulder)
  const noseToRightShoulder = getDistance(nose, rightShoulder)
  const leftShoulderToRightShoulder = getDistance(leftShoulder, rightShoulder)
  const ratio = noseToLeftShoulder / leftShoulderToRightShoulder

  debug.innerHTML = noseToLeftShoulder + '<br />'
    + noseToRightShoulder + '<br />'
    + leftShoulderToRightShoulder + '<br />'
    + ratio

  if (ratio < 0.7) {
    audio.play()
  }
}

// recursive call to estimate and draw pose using requestAnimationFrame
drawPoseInRealTime = (video, canvas, net) => {
  drawPose = async () => {
    const pose = await net.estimateSinglePose(video);
    const keypoints = pose.keypoints.filter(point => point.score > 0.5)

    const canvasCtx = canvas.getContext('2d');

    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    canvasCtx.save() // push default state to stack to prepare for the flip
    canvasCtx.translate(canvas.width, 0) // move right
    canvasCtx.scale(-1, 1) // flip on x to achieve mirroring effect
    canvasCtx.drawImage(video, 0, 0, video.width, video.height)
    keypoints.forEach(point => {
      if (point.score > 0.5) {
        drawPoint(point.position.x, point.position.y, canvasCtx);
      }
    })

    const leftShoulder = findPart('leftShoulder', keypoints)
    const rightShoulder = findPart('rightShoulder', keypoints)
    drawLine(leftShoulder, rightShoulder, canvasCtx)
    canvasCtx.restore() // restore default state (not mirroring)

    checkNeck(keypoints)

    window.requestAnimationFrame(drawPose)
  }

  drawPose()
}

bind = async () => {
  const width = 500;
  const height = 500;
  const mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      width: width,
      height: height,
    },
  });
  const video = document.getElementById('video');
  video.width = width;
  video.height = height;
  video.srcObject = mediaStream;

  const canvas = document.getElementById('canvas');
  canvas.width = video.width;
  canvas.height = video.height;

  const net = await posenet.load();
  video.onloadeddata = () => drawPoseInRealTime(video, canvas, net);
}

bind();
