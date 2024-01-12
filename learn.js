let video;
let poseNet;
let pose;
let skeleton;
let thirtysecs;
let posesArray = ['Mountain', 'Tree', 'Downward Dog', 'Warrior I', 'Warrior II', 'Chair'];
var imgArray = new Array();

var poseImage;

let yogi;
let poseLabel;

var targetLabel;
var errorCounter;
var iterationCounter;
var poseCounter;
var target;
// Number of last elements to work with, in the 'timestamped_measures' node of the database: 
const nbOfElts = 300;
var timeLeft;

const firebaseConfig = {
  apiKey: "AIzaSyArTZpA6eHd5AgMaDpjKYWx2e6At-e0KJQ",
  authDomain: "smart-reps.firebaseapp.com",
  databaseURL: "https://smart-reps-default-rtdb.firebaseio.com",
  projectId: "smart-reps",
  storageBucket: "smart-reps.appspot.com",
  messagingSenderId: "10742891124",
  appId: "1:10742891124:web:52377a879d7230853bc721",
  measurementId: "G-9F8SJLRTP7"
};

firebase.initializeApp(firebaseConfig);

var messagesRef = firebase.database().ref('messages');

var buzzerRef = firebase.database().ref('test/int');
function setup() {
  var canvas = createCanvas(640, 480);
  canvas.position(130, 210);
  video = createCapture(VIDEO);
  video.hide();
  poseNet = ml5.poseNet(video, modelLoaded);
  poseNet.on('pose', gotPoses);

  imgArray[0] = new Image();
  imgArray[0].src = 'imgs/mountain.svg';
  imgArray[1] = new Image();
  imgArray[1].src = 'imgs/tree.svg';
  imgArray[2] = new Image();
  imgArray[2].src = 'imgs/dog.svg';
  imgArray[3] = new Image();
  imgArray[3].src = 'imgs/warrior1.svg';
  imgArray[4] = new Image();
  imgArray[4].src = 'imgs/warrior2.svg';
  imgArray[5] = new Image();
  imgArray[5].src = 'imgs/chair.svg';

  poseCounter = 0;
  targetLabel = 1;
  target = posesArray[poseCounter];
  document.getElementById("poseName").textContent = target;
  timeLeft = 10;
  document.getElementById("time").textContent = "00:" + timeLeft;
  errorCounter = 0;
  iterationCounter = 0;
  document.getElementById("poseImg").src = imgArray[poseCounter].src;


  firebase.database().ref('test/append').limitToLast(nbOfElts).on('value', ts_measures => {
    // If you want to get into details, read the following comments :-)
    // 'ts_measures' is a snapshot raw Object, obtained on changed value of 'timestamped_measures' node
    // e.g. a new push to that node, but is not exploitable yet.
    // If we apply the val() method to it, we get something to start work with,
    // i.e. an Object with the 'nbOfElts' last nodes in 'timestamped_measures' node.
    // console.log(ts_measures.val());
    // => {-LIQgqG3c4MjNhJzlgsZ: {timestamp: 1532694324305, value: 714}, -LIQgrs_ejvxcF0MqFre: {…}, … }

    // We prepare empty arrays to welcome timestamps and luminosity values:
    let timestamps = [];
    let values = [];

    // Next, we iterate on each element of the 'ts_measures' raw Object
    // in order to fill the arrays.
    // Let's call 'ts_measure' ONE element of the ts_measures raw Object
    // A handler function written here as an anonymous function with fat arrow syntax
    // tells what to do with each element:
    // * apply the val() method to it to gain access to values of 'timestamp' and 'value',
    // * push those latter to the appropriate arrays.
    // Note: The luminosity value is directly pushed to 'values' array but the timestamp,
    // which is an Epoch time in milliseconds, is converted to human date
    // thanks to the moment().format() function coming from the moment.js library.    
    ts_measures.forEach(ts_measure => {
      //console.log(ts_measure.val().timestamp, ts_measure.val().value);
      timestamps.push(moment(ts_measure.val().Ts).format('YYYY-MM-DD HH:mm:ss'));
      values.push(ts_measure.val().value);
    });

    // Get a reference to the DOM node that welcomes the plot drawn by Plotly.js:
    myPlotDiv = document.getElementById('myPlot');

    // We generate x and y data necessited by Plotly.js to draw the plot
    // and its layout information as well:
    // See https://plot.ly/javascript/getting-started/
    const data = [{
      x: timestamps,
      y: values
    }];

    const layout = {
      title: '<b>Body Heat live plot</b>',
      titlefont: {
        family: 'Courier New, monospace',
        size: 16,
        color: '#000'
      },
      xaxis: {
        linecolor: 'black',
        linewidth: 2
      },
      yaxis: {
        title: '<b>Temperature (°C)</b>',
        titlefont: {
          family: 'Courier New, monospace',
          size: 14,
          color: '#000'
        },
        linecolor: 'black',
        linewidth: 2,
      },
      margin: {
        r: 50,
        pad: 0
      }
    }
    // At last we plot data :-)
    Plotly.newPlot(myPlotDiv, data, layout, { responsive: true });
  });


  let options = {
    inputs: 34,
    outputs: 6,
    task: 'classification',
    debug: true
  }

  yogi = ml5.neuralNetwork(options);
  const modelInfo = {
    model: 'modelv2/model2.json',
    metadata: 'modelv2/model_meta2.json',
    weights: 'modelv2/model.weights2.bin',
  };
  yogi.load(modelInfo, yogiLoaded);
}

function yogiLoaded() {
  console.log("Model ready!");
  classifyPose();
}

function classifyPose() {
  if (pose) {
    let inputs = [];
    for (let i = 0; i < pose.keypoints.length; i++) {
      let x = pose.keypoints[i].position.x;
      let y = pose.keypoints[i].position.y;
      inputs.push(x);
      inputs.push(y);
    }
    yogi.classify(inputs, gotResult);
  } else {
    console.log("Pose not found");
    setTimeout(classifyPose, 100);
  }
}

function gotResult(error, results) {
  document.getElementById("welldone").textContent = "";
  document.getElementById("sparkles").style.display = "none";
  if (results[0].confidence > 0.70) {
    console.log("Confidence");
    if (results[0].label == targetLabel.toString()) {
      console.log(targetLabel);
      iterationCounter = iterationCounter + 1;

      console.log(iterationCounter)

      if (iterationCounter == 10) {
        console.log("30!")
        iterationCounter = 0;
        nextPose();
      }
      else {
        console.log("doin this")
        timeLeft = timeLeft - 1;
        if (timeLeft < 10) {
          document.getElementById("time").textContent = "00:0" + timeLeft;
        } else {
          document.getElementById("time").textContent = "00:" + timeLeft;
        }
        setTimeout(classifyPose, 1000);
      }
    }
    else {
      errorCounter = errorCounter + 1;
      console.log("error");
      if (errorCounter >= 4) {
        console.log("four errors");
        iterationCounter = 0;
        timeLeft = 10;

        if (timeLeft < 10) {
          document.getElementById("time").textContent = "00:0" + timeLeft;
        } else {

          document.getElementById("time").textContent = "00:" + timeLeft;
        }
        errorCounter = 0;
        setTimeout(classifyPose, 100);
      } else {
        setTimeout(classifyPose, 100);
      }
    }
  }
  else {
    console.log("whatwe really dont want")
    setTimeout(classifyPose, 100);
  }
}


function gotPoses(poses) {
  if (poses.length > 0) {
    pose = poses[0].pose;
    skeleton = poses[0].skeleton;
  }
}

function modelLoaded() {
  document.getElementById("rectangle").style.display = "none";
  console.log('poseNet ready');
}

function draw() {
  push();
  translate(video.width, 0);
  scale(-1, 1);
  image(video, 0, 0, video.width, video.height);

  if (pose) {
    for (let i = 0; i < skeleton.length; i++) {
      let a = skeleton[i][0];
      let b = skeleton[i][1];
      strokeWeight(8);
      stroke(244, 194, 194);
      line(a.position.x, a.position.y, b.position.x, b.position.y);
    }
  }
  pop();
}

function nextPose() {
  if (poseCounter >= 5) {
    console.log("Well done, you have learnt all poses!");
    document.getElementById("finish").textContent = "Amazing!";
    document.getElementById("welldone").textContent = "All poses done.";
    document.getElementById("sparkles").style.display = 'block';
  } else {
    console.log("Well done, you all poses!");
    //var stars = document.getElementById("starsid");
    //stars.classList.add("stars.animated");
    errorCounter = 0;
    iterationCounter = 0;
    poseCounter = poseCounter + 1;
    targetLabel = poseCounter + 1;
    console.log("next pose target label" + targetLabel)
    var newMessageRef = messagesRef.push();
    newMessageRef.set({
      name: targetLabel,
    });

    buzzerRef.set(1);
    //set timeout then set buzzer to 0
    setTimeout(function () {
      buzzerRef.set(0);
    }, 6000);


    target = posesArray[poseCounter];
    document.getElementById("poseName").textContent = target;
    document.getElementById("welldone").textContent = "Well done, next pose!";
    document.getElementById("sparkles").style.display = 'block';
    document.getElementById("poseImg").src = imgArray[poseCounter].src;
    console.log("classifying again");
    timeLeft = 10;
    document.getElementById("time").textContent = "00:" + timeLeft;
    setTimeout(classifyPose, 4000)
  }
}
