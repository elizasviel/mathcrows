import "phaser";
import MainScene from "./scenes/main";

const config = {
  type: Phaser.AUTO,
  backgroundColor: "#18647c", // Ocean blue background
  scale: {
    parent: "game",
    mode: Phaser.Scale.FIT,
    width: window.innerWidth * window.devicePixelRatio,
    height: window.innerHeight * window.devicePixelRatio,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [MainScene],
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
      gravity: { y: 0 }, // No gravity for our shark game
    },
  },
  dom: {
    createContainer: true,
  },
};

window.addEventListener("load", () => {
  new Phaser.Game(config);
});
