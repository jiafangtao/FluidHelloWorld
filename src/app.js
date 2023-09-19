/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { SharedMap, SharedString } from "fluid-framework";
import { TinyliciousClient } from "@fluidframework/tinylicious-client";
import * as THREE from 'three';

/*
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const controls = new OrbitControls( camera, renderer.domElement );
const loader = new GLTFLoader();
*/


export const diceValueKey = "dice-value-key";
export const rotationX = "rotation-x-key";
export const rotationY = "rotation-y-key";
// Load container and render the app

const client = new TinyliciousClient();
const containerSchema = {
  initialObjects: { diceMap: SharedMap, freeText: SharedString, rotation: SharedMap },
};

const root = document.getElementById("content");
const freetext = document.getElementById("freetext");
const { container } = await client.createContainer(containerSchema);

const createNewDice = async () => {
  container.initialObjects.diceMap.set(diceValueKey, 1);
  container.initialObjects.freeText.insertText(0, "");
  const id = await container.attach();
  renderDiceRoller(container.initialObjects.diceMap, root);
  renderText(container.initialObjects.freeText, freetext);
  renderCanvas(container.initialObjects.rotation, true);

  return id;
};

const loadExistingDice = async (id) => {
  const { container } = await client.getContainer(id, containerSchema);
  renderDiceRoller(container.initialObjects.diceMap, root);
  renderText(container.initialObjects.freeText, freetext);

  renderCanvas(container.initialObjects.rotation, false);
};

async function start() {
  var isOwner = false;

  if (location.hash) {
    isOwner = false;
    await loadExistingDice(location.hash.substring(1));
  } else {
    const id = await createNewDice();
    location.hash = id;
    isOwner = true;
  }

  createScene(isOwner);
}

start().catch((error) => console.error(error));

// Define the view
const template = document.createElement("template");

template.innerHTML = `
  <style>
    .wrapper { text-align: center }
    .dice { font-size: 200px }
    .roll { font-size: 50px;}
  </style>
  <div class="wrapper">
    <div class="dice"></div>
    <button class="roll"> Roll </button>
  </div>
`;

const renderDiceRoller = (diceMap, elem) => {
  elem.appendChild(template.content.cloneNode(true));

  const rollButton = elem.querySelector(".roll");
  const dice = elem.querySelector(".dice");

  // Set the value at our dataKey with a random number between 1 and 6.
  rollButton.onclick = () => diceMap.set(diceValueKey, Math.floor(Math.random() * 6) + 1);

  // Get the current value of the shared data to update the view whenever it changes.
  const updateDice = () => {
    const diceValue = diceMap.get(diceValueKey);
    // Unicode 0x2680-0x2685 are the sides of a dice (⚀⚁⚂⚃⚄⚅)
    dice.textContent = String.fromCodePoint(0x267f + diceValue);
    dice.style.color = `hsl(${diceValue * 60}, 70%, 30%)`;
  };
  updateDice();

  // Use the changed event to trigger the rerender whenever the value changes.
  diceMap.on("valueChanged", updateDice);
  // Setting "fluidStarted" is just for our test automation
  window["fluidStarted"] = true;
};

const renderCanvas = (rotation, isOwner) => {

  const fakeAnimation = (x, y) => {
    cube.rotation.x = x;
    cube.rotation.y = y;

    renderer.render(scene, camera);
  };
  const updateCanvas = () => {
    //TODO: take the x,y value of rotation into account
    if (!isOwner) {
      const x = rotation.get(rotationX);
      const y = rotation.get(rotationY);
      console.log("rotation: x=" + x + ", y=" + y);
      fakeAnimation(x, y);
    }
  };
  rotation.on("valueChanged", updateCanvas);

};

const renderText = (textString, textArea) => {

  // Set the value at our dataKey with a random number between 1 and 6.
  textArea.oninput = () => {
    //textString.insertText(0, textArea.value);
    textString.replaceText(0, textString.getLength(), textArea.value);
    console.debug("you are typing someting ...");
  }

  // Get the current value of the shared data to update the view whenever it changes.
  const updateText = () => {
    const textValue = textString.getText();
    textArea.value = textValue;
  };
  updateText();

  // Use the changed event to trigger the rerender whenever the value changes.
  textString.on("sequenceDelta", updateText);
};

// evil global stuff ...
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

const createScene = (isOwner) => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  camera.position.z = 5;

  function animate() {
    requestAnimationFrame(animate);

    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;

    container.initialObjects.rotation.set(rotationX, cube.rotation.x);
    container.initialObjects.rotation.set(rotationY, cube.rotation.y);

    renderer.render(scene, camera);
  }

  if (isOwner) animate();
};
