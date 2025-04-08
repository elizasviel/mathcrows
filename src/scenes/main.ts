import "phaser";

export default class MainScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private crows!: Phaser.Physics.Arcade.Group;
  private currentAnswer: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private score: number = 0;
  private answerInput: string = "";
  private timerEvents: Phaser.Time.TimerEvent[] = [];
  private numpad!: Phaser.GameObjects.Container;
  private numpadDisplay!: Phaser.GameObjects.Text;
  private numpadTitle!: Phaser.GameObjects.Text;

  // Removed level system variables
  private crowsDefeated: number = 0;

  // Import wizard assets
  private wizardIdle = "assets/images/wizard/Wanderer Magican/Idle.png";
  private wizardAttack = "assets/images/wizard/Wanderer Magican/Attack_1.png";

  // Import crow assets
  private crowFly =
    "assets/images/crowpack_assets/crowpack_spritesheets/crow_fly_strip6.png";
  private crowHurt =
    "assets/images/crowpack_assets/crowpack_spritesheets/crow_hurt_strip5.png";

  // Background layers
  private background1 = "assets/images/level/Background1.png";
  private background2 = "assets/images/level/Background2.png";
  private background3 = "assets/images/level/Background3.png";
  private background4 = "assets/images/level/Background4.png";
  private background5 = "assets/images/level/Background5.png";

  // Add tilemap asset
  private ledgeTilemap = "assets/ledge.tmj";
  private tilesImage = "assets/images/level/MainLevBuild.png";

  private map!: Phaser.Tilemaps.Tilemap;
  private tileset!: Phaser.Tilemaps.Tileset;
  private layer!: Phaser.Tilemaps.TilemapLayer;

  // Add after other private properties
  private currentWave: number = 0;
  private crowsInWave: number = 0;
  private crowsRemainingInWave: number = 0;
  private waveText!: Phaser.GameObjects.Text;
  private nextWaveButton!: Phaser.GameObjects.Container;
  private isWaveActive: boolean = false;

  // Add these properties to the class
  private waveStartTime: number = 0;
  private perfectWaveStreak: number = 0;
  private waveStreakText!: Phaser.GameObjects.Text;
  private missedAnswers: number = 0;

  private electricParticles!: Phaser.GameObjects.Particles.ParticleEmitterManager;

  // Sound assets
  private buttonSound = "assets/sounds/buttonpress.mp3";
  private zapSound = "assets/sounds/zap.mp3";
  private bgMusic = "assets/sounds/music.mp3";

  constructor() {
    super("main");
  }

  preload() {
    // Load background layers
    this.load.image("background1", this.background1);
    this.load.image("background2", this.background2);
    this.load.image("background3", this.background3);
    this.load.image("background4", this.background4);
    this.load.image("background5", this.background5);

    // Load tilemap and tileset
    this.load.tilemapTiledJSON("ledge", this.ledgeTilemap);
    this.load.image("tiles", this.tilesImage);

    // Load the wizard sprite sheets with proper URLs
    this.load.spritesheet("wizard_idle", this.wizardIdle, {
      frameWidth: 128,
      frameHeight: 128,
    });

    this.load.spritesheet("wizard_attack", this.wizardAttack, {
      frameWidth: 128,
      frameHeight: 128,
    });

    // Load the crow sprite sheets
    this.load.spritesheet("crow_fly", this.crowFly, {
      frameWidth: 40,
      frameHeight: 40,
    });

    this.load.spritesheet("crow_hurt", this.crowHurt, {
      frameWidth: 40,
      frameHeight: 40,
    });

    // Load electric particle effect
    this.load.spritesheet("electric", "assets/images/particles/Electric.png", {
      frameWidth: 96,
      frameHeight: 96,
    });

    // Load sound effects and music
    this.load.audio("buttonSound", this.buttonSound);
    this.load.audio("zapSound", this.zapSound);
    this.load.audio("bgMusic", this.bgMusic);
  }

  create() {
    // Set up layered backgrounds with different depths
    this.setupBackgrounds();

    // Start background music
    const music = this.sound.add("bgMusic", { loop: true, volume: 0.5 });
    music.play();

    // Create tilemap
    this.setupTilemap();

    // Create animation for wizard idle
    this.anims.create({
      key: "idle",
      frames: this.anims.generateFrameNumbers("wizard_idle", {
        start: 0,
        end: 7,
      }),
      frameRate: 10,
      repeat: -1,
    });

    // Create animation for wizard attack
    this.anims.create({
      key: "attack",
      frames: this.anims.generateFrameNumbers("wizard_attack", {
        start: 0,
        end: 8,
      }),
      frameRate: 8,
      repeat: 0,
    });

    // Create crow fly animation
    this.anims.create({
      key: "crow_fly_anim",
      frames: this.anims.generateFrameNumbers("crow_fly", {
        start: 0,
        end: 5,
      }),
      frameRate: 10,
      repeat: -1,
    });

    // Create crow hurt animation
    this.anims.create({
      key: "crow_hurt_anim",
      frames: this.anims.generateFrameNumbers("crow_hurt", {
        start: 0,
        end: 4,
      }),
      frameRate: 10,
      repeat: 0,
    });

    // Create crow fall animation (using the last 2 frames of hurt animation)
    this.anims.create({
      key: "crow_fall_anim",
      frames: this.anims.generateFrameNumbers("crow_hurt", {
        start: 3,
        end: 4,
      }),
      frameRate: 4,
      repeat: -1, // Loop the fall animation
    });

    // Add player (position on left side)
    this.player = this.physics.add.sprite(
      100,
      this.cameras.main.height / 2,
      "wizard_idle"
    );
    this.player.setCollideWorldBounds(true);
    this.player.setScale(4);
    this.player.play("idle");
    this.player.setDepth(50);

    // Set up crow group with physics
    this.crows = this.physics.add.group();

    // Create a UI container for all HUD elements
    const uiContainer = this.add.container(0, 0).setDepth(100);

    // Enhanced score display in top right with modern styling
    const scorePanel = this.add.container(this.cameras.main.width - 360, 16);

    // Create a gradient background for score
    const scoreBg = this.add.graphics();
    scoreBg.fillGradientStyle(0x2c3e50, 0x2c3e50, 0x34495e, 0x34495e, 1);
    scoreBg.fillRoundedRect(0, 0, 340, 70, 15);
    scoreBg.lineStyle(3, 0x3498db);
    scoreBg.strokeRoundedRect(0, 0, 340, 70, 15);

    // Add glow effect to score
    const scoreGlow = this.add.graphics();
    scoreGlow.lineStyle(2, 0x3498db, 0.3);
    scoreGlow.strokeRoundedRect(-2, -2, 344, 74, 16);

    this.scoreText = this.add.text(20, 15, "Score: 0", {
      fontSize: "42px",
      fontFamily: "Arial, sans-serif",
      color: "#ecf0f1",
      stroke: "#2c3e50",
      strokeThickness: 4,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: "#000",
        blur: 5,
        fill: true,
      },
    });

    scorePanel.add([scoreGlow, scoreBg, this.scoreText]);

    // Enhanced wave display with modern styling
    const wavePanel = this.add.container(this.cameras.main.width - 360, 96);

    const waveBg = this.add.graphics();
    waveBg.fillGradientStyle(0x2c3e50, 0x2c3e50, 0x34495e, 0x34495e, 1);
    waveBg.fillRoundedRect(0, 0, 340, 70, 15);
    waveBg.lineStyle(3, 0x9b59b6);
    waveBg.strokeRoundedRect(0, 0, 340, 70, 15);

    const waveGlow = this.add.graphics();
    waveGlow.lineStyle(2, 0x9b59b6, 0.3);
    waveGlow.strokeRoundedRect(-2, -2, 344, 74, 16);

    this.waveText = this.add.text(20, 15, "Wave: 0", {
      fontSize: "42px",
      fontFamily: "Arial, sans-serif",
      color: "#ecf0f1",
      stroke: "#2c3e50",
      strokeThickness: 4,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: "#000",
        blur: 5,
        fill: true,
      },
    });

    wavePanel.add([waveGlow, waveBg, this.waveText]);

    // Enhanced streak display
    const streakPanel = this.add.container(this.cameras.main.width - 360, 176);

    const streakBg = this.add.graphics();
    streakBg.fillGradientStyle(0x2c3e50, 0x2c3e50, 0x34495e, 0x34495e, 1);
    streakBg.fillRoundedRect(0, 0, 340, 70, 15);
    streakBg.lineStyle(3, 0xf1c40f);
    streakBg.strokeRoundedRect(0, 0, 340, 70, 15);

    const streakGlow = this.add.graphics();
    streakGlow.lineStyle(2, 0xf1c40f, 0.3);
    streakGlow.strokeRoundedRect(-2, -2, 344, 74, 16);

    this.waveStreakText = this.add.text(20, 15, "Perfect Streak: 0", {
      fontSize: "42px",
      fontFamily: "Arial, sans-serif",
      color: "#ecf0f1",
      stroke: "#2c3e50",
      strokeThickness: 4,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: "#000",
        blur: 5,
        fill: true,
      },
    });

    streakPanel.add([streakGlow, streakBg, this.waveStreakText]);

    // Add all panels to the UI container
    uiContainer.add([scorePanel, wavePanel, streakPanel]);

    // Enhanced instructions text with better styling
    const instructions = this.add
      .text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2,
        "Math Crows!\n\nSolve multiplication problems to defeat crows\nClick numbers on the numpad and Attack to defeat crows\n\nClick to start!",
        {
          fontSize: "32px",
          fontFamily: "Arial, sans-serif",
          color: "#ecf0f1",
          stroke: "#2c3e50",
          strokeThickness: 6,
          align: "center",
          shadow: {
            offsetX: 3,
            offsetY: 3,
            color: "#000",
            blur: 8,
            fill: true,
          },
        }
      )
      .setOrigin(0.5)
      .setDepth(100);

    // Add subtle floating animation to instructions
    this.tweens.add({
      targets: instructions,
      y: "+=20",
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Create next wave button (after instructions)
    this.createNextWaveButton();

    // Start game on click
    this.input.once("pointerdown", () => {
      instructions.destroy();
      this.createNumpad();
      this.showNextWaveButton();
    });

    // Add resize handler to keep UI in position
    this.scale.on("resize", this.updateUIPosition, this);

    // Create electric particle emitter
    this.electricParticles = this.add.particles("electric");
    this.electricParticles.setDepth(60);

    // Create electric animation
    this.anims.create({
      key: "electric_anim",
      frames: this.anims.generateFrameNumbers("electric", { start: 0, end: 8 }),
      frameRate: 20,
      repeat: 0,
    });
  }

  update() {
    // Remove up/down movement code
    this.input.keyboard.createCursorKeys();
    this.player.setVelocityY(0);

    // Check for crows that have gone off screen
    this.crows.getChildren().forEach((crow: any) => {
      // Update text position to follow crow
      const container = crow.getData("container");
      const problemOffset = crow.getData("problemOffset") || 0;

      if (container) {
        container.setPosition(crow.x, crow.y + problemOffset);
      }

      if (crow.x < 0) {
        // Game over if crow reaches the left side
        this.gameOver();
        crow.destroy();
      }
    });

    // Update numpad position to follow player - moved higher up
    if (this.numpad) {
      this.numpad.setPosition(this.player.x, this.player.y - 300);
    }
  }

  private createNextWaveButton() {
    const button = this.add.container(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2
    );

    const buttonWidth = 360;
    const buttonHeight = 90;

    // Create gradient background
    const background = this.add.graphics();
    background.fillGradientStyle(0x3498db, 0x3498db, 0x2980b9, 0x2980b9, 1);
    background.fillRoundedRect(
      -buttonWidth / 2,
      -buttonHeight / 2,
      buttonWidth,
      buttonHeight,
      20
    );
    background.lineStyle(4, 0x74b9ff);
    background.strokeRoundedRect(
      -buttonWidth / 2,
      -buttonHeight / 2,
      buttonWidth,
      buttonHeight,
      20
    );

    const text = this.add
      .text(0, 0, "Start Wave 1", {
        fontSize: "44px",
        fontFamily: "Arial, sans-serif",
        color: "#fff",
        stroke: "#2c3e50",
        strokeThickness: 4,
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: "#000",
          blur: 5,
          fill: true,
        },
      })
      .setOrigin(0.5);

    button.add([background, text]);
    button.setDepth(100);

    // Add hover effects
    button.setInteractive(
      new Phaser.Geom.Rectangle(
        -buttonWidth / 2,
        -buttonHeight / 2,
        buttonWidth,
        buttonHeight
      ),
      Phaser.Geom.Rectangle.Contains
    );

    button.on("pointerover", () => {
      this.tweens.add({
        targets: button,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100,
      });
    });

    button.on("pointerout", () => {
      this.tweens.add({
        targets: button,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
      });
    });

    button.on("pointerdown", () => {
      this.startNextWave();
      button.setVisible(false);
    });

    this.nextWaveButton = button;
    this.nextWaveButton.setVisible(false);
  }

  private showNextWaveButton() {
    const nextWaveNum = this.currentWave + 1;
    const buttonText = this.nextWaveButton.getAt(1) as Phaser.GameObjects.Text;
    buttonText.setText(`Start Wave ${nextWaveNum}`);
    this.nextWaveButton.setVisible(true);
  }

  private startNextWave() {
    this.currentWave++;
    this.crowsInWave = Math.min(this.currentWave * 3, 50);
    this.crowsRemainingInWave = this.crowsInWave;
    this.isWaveActive = true;
    this.waveText.setText(`Wave: ${this.currentWave}`);
    this.missedAnswers = 0;
    this.waveStartTime = this.time.now;

    // Clear any existing spawn timers
    this.timerEvents.forEach((timer) => timer.destroy());
    this.timerEvents = [];

    // Start spawning crows for this wave
    this.timerEvents.push(
      this.time.addEvent({
        delay: 2000,
        callback: this.spawnCrow,
        callbackScope: this,
        loop: true,
      })
    );
  }

  private handleCrowDefeat(crow: Phaser.Physics.Arcade.Sprite) {
    crow.play("crow_hurt_anim");
    crow.once("animationcomplete", () => {
      crow.play("crow_fall_anim");
    });

    // Clean up crow resources
    const container = crow.getData("container");
    if (container) container.destroy();
    crow.destroy();

    // Check wave completion
    this.checkWaveCompletion();
  }

  private checkWaveCompletion() {
    if (this.isWaveActive) {
      const remainingCrows = this.crows.countActive();

      if (remainingCrows === 0 && this.crowsRemainingInWave === 0) {
        this.isWaveActive = false;

        // Calculate bonuses
        const timeElapsed = (this.time.now - this.waveStartTime) / 1000;
        const timeBonus = Math.max(0, Math.floor(300 - timeElapsed * 10));
        let perfectBonus = 0;
        if (this.missedAnswers === 0) {
          this.perfectWaveStreak++;
          perfectBonus = this.perfectWaveStreak * 100;
        } else {
          this.perfectWaveStreak = 0;
        }
        const waveBonus = this.currentWave * 50;

        // Update score
        const totalBonus = timeBonus + perfectBonus + waveBonus;
        this.score += totalBonus;
        this.scoreText.setText(`Score: ${this.score}`);
        this.waveStreakText.setText(
          `Perfect Streak: ${this.perfectWaveStreak}`
        );

        // Show completion effects - button will be shown after text animations
        this.showWaveCompletionEffects(timeBonus, perfectBonus, waveBonus);
      }
    }
  }

  private spawnCrow() {
    if (!this.isWaveActive || this.crowsRemainingInWave <= 0) {
      // Stop the spawn timer when no more crows should spawn
      this.timerEvents.forEach((timer) => timer.destroy());
      this.timerEvents = [];
      this.checkWaveCompletion(); // Add this line to check completion when spawning stops
      return;
    }

    // Generate random multiplication problem (single digits)
    const num1 = Phaser.Math.Between(1, 9);
    const num2 = Phaser.Math.Between(1, 9);
    const problem = `${num1} × ${num2} = ?`;
    this.currentAnswer = num1 * num2;

    // Create crow at right side of screen with random y position
    // Set minimum Y to 200 to ensure the problem text doesn't get cut off at the top
    const crow = this.crows.create(
      this.cameras.main.width + 50,
      Phaser.Math.Between(200, this.cameras.main.height - 200),
      "crow_fly"
    ) as Phaser.Physics.Arcade.Sprite;

    // Set depth to ensure crow is above backgrounds
    crow.setDepth(50);
    crow.setScale(8);
    crow.setFlipX(true);

    // Play fly animation
    crow.play("crow_fly_anim");

    // Create a better looking background for the problem text
    const textBg = this.add.graphics();
    // Gradient fill
    textBg.fillGradientStyle(0x3b5998, 0x3b5998, 0x192a56, 0x192a56, 1);
    textBg.fillRoundedRect(-70, -80, 140, 55, 16);
    // Add glow effect with double border
    textBg.lineStyle(4, 0x8395a7, 0.8);
    textBg.strokeRoundedRect(-70, -80, 140, 55, 16);
    textBg.lineStyle(2, 0xffffff, 0.6);
    textBg.strokeRoundedRect(-68, -78, 136, 51, 14);

    // Add improved problem text to crow - positioned higher
    const text = this.add.text(0, -52, problem, {
      fontSize: "28px",
      fontFamily: "Arial, sans-serif",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 4,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: "#000",
        blur: 5,
        fill: true,
      },
      align: "center",
    });
    text.setDepth(55);
    text.setOrigin(0.5);

    // Add a subtle floating animation to the text
    this.tweens.add({
      targets: text,
      y: "-=4",
      duration: 1000,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1,
    });

    // Define offset for the math problem (how high above the crow)
    const problemOffset = -100;
    crow.setData("problemOffset", problemOffset);

    // Container for problem display with background - positioned higher
    const container = this.add
      .container(crow.x, crow.y + problemOffset, [textBg, text])
      .setDepth(55);

    // Update the container position in update
    crow.setData("problemText", text);
    crow.setData("textBg", textBg);
    crow.setData("container", container);
    crow.setData("problem", problem);
    crow.setData("answer", this.currentAnswer);

    // Move crow towards player
    crow.setVelocityX(-180);

    // Add some vertical movement to make crows more interesting
    const tween = this.tweens.add({
      targets: crow,
      y: crow.y + Phaser.Math.Between(-100, 100),
      duration: 2000,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1,
    });

    // Store tween reference for later pause when hurt
    crow.setData("movementTween", tween);

    // Track defeated crows - removed level progression
    this.crowsDefeated++;

    this.crowsRemainingInWave--;

    // Check if this was the last crow to spawn
    if (this.crowsRemainingInWave === 0) {
      this.timerEvents.forEach((timer) => timer.destroy());
      this.timerEvents = [];
    }
  }

  private createNumpad() {
    // Define colors for the UI
    const COLOR_PRIMARY = 0x4e342e;
    const COLOR_LIGHT = 0x7b5e57;
    const COLOR_ATTACK = 0x2ecc71;
    const COLOR_BG = 0x222222;

    // Create the main container for the numpad - moved higher up
    this.numpad = this.add.container(this.player.x, this.player.y - 300);
    this.numpad.setDepth(100);

    // Button size and spacing - increased for larger calculator
    const buttonSize = { width: 62, height: 62 };
    const buttonSpace = 12;
    // Calculate the width of a row (3 buttons + 2 spaces)
    const rowWidth = buttonSize.width * 3 + buttonSpace * 2;

    // Add main background for the entire calculator - expanded with more bottom padding
    const mainBg = this.add
      .rectangle(0, 0, 275, 475, COLOR_BG, 0.85)
      .setStrokeStyle(4, COLOR_LIGHT)
      .setOrigin(0.5);
    this.numpad.add(mainBg);

    // Create display for input - match width to row of buttons
    this.numpadDisplay = this.add
      .text(0, -130, "", {
        fontSize: "38px",
        fontFamily: "Courier, monospace",
        color: "#f5f6fa",
        backgroundColor: "#2c3e50",
        padding: { x: 15, y: 12 },
        align: "center",
        fixedWidth: rowWidth,
      })
      .setOrigin(0.5);

    // Create a title for the calculator
    this.numpadTitle = this.add
      .text(0, -185, "MAGIC CALCULATOR", {
        fontSize: "22px",
        fontFamily: "Arial, sans-serif",
        color: "#dff9fb",
        stroke: "#0a3d62",
        strokeThickness: 3,
        align: "center",
      })
      .setOrigin(0.5);

    // Add the display and title to the container
    this.numpad.add([this.numpadDisplay, this.numpadTitle]);

    // Create buttons directly using Phaser
    const startX = -buttonSize.width - buttonSpace;
    const startY = -50; // Move buttons up to fit within the background

    // Create the numpad grid (3x4)
    const buttonLabels = [
      ["1", "2", "3"],
      ["4", "5", "6"],
      ["7", "8", "9"],
      ["<", "0", "↵"], // Changed ATTACK to ↵ (enter icon)
    ];

    // Create all buttons
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 3; col++) {
        const x = startX + col * (buttonSize.width + buttonSpace);
        const y = startY + row * (buttonSize.height + buttonSpace);
        const label = buttonLabels[row][col];

        // Choose background color based on button type
        let bgColor = COLOR_PRIMARY;
        if (label === "↵") {
          bgColor = COLOR_ATTACK;
        } else if (label === "<") {
          bgColor = 0xe74c3c; // Red for delete
        }

        // Create button background - all keys same size
        const button = this.add
          .rectangle(x, y, buttonSize.width, buttonSize.height, bgColor)
          .setStrokeStyle(3, COLOR_LIGHT);

        // Create button text
        const text = this.add
          .text(x, y, label, {
            fontSize: label === "↵" ? "35px" : "30px",
            color: "#ffffff",
            fontStyle: "bold",
          })
          .setOrigin(0.5);

        // Make button interactive
        button.setInteractive();

        // Add click handler
        button.on("pointerdown", () => {
          if (label === "↵") {
            this.checkAnswer();
          } else if (label === "<") {
            this.onNumpadDelete();
          } else {
            this.onNumpadButtonClick(label);
          }
        });

        // Add visual feedback
        button.on("pointerover", () => {
          button.fillColor = Phaser.Display.Color.GetColor32(
            ((bgColor >> 16) & 0xff) + 20,
            ((bgColor >> 8) & 0xff) + 20,
            (bgColor & 0xff) + 20,
            1
          );
        });

        button.on("pointerout", () => {
          button.fillColor = bgColor;
        });

        // Add to container
        this.numpad.add([button, text]);
      }
    }
  }

  private onNumpadButtonClick(value: string) {
    // Play button sound
    this.sound.play("buttonSound", { volume: 0.5 });

    if (this.answerInput.length < 3) {
      this.answerInput += value;
      this.numpadDisplay.setText(this.answerInput);
    }
  }

  private onNumpadDelete() {
    // Remove the last character from the input
    if (this.answerInput.length > 0) {
      // Play button sound for backspace
      this.sound.play("buttonSound", { volume: 0.5 });
      this.answerInput = this.answerInput.slice(0, -1);
      this.numpadDisplay.setText(this.answerInput);
    }
  }

  private checkAnswer() {
    const userAnswer = parseInt(this.answerInput);
    let matchFound = false;

    this.crows.getChildren().forEach((crow: any) => {
      if (crow.getData("answer") === userAnswer) {
        matchFound = true;

        // Play button sound for enter
        this.sound.play("buttonSound", { volume: 0.5 });

        // Play attack animation and handle crow defeat
        this.player.play("attack");
        this.player.once("animationcomplete", () => {
          this.player.play("idle");
        });

        // Stop crow movement
        crow.setVelocityX(0);
        crow.setVelocityY(0);

        // Pause movement tween
        const tween = crow.getData("movementTween");
        if (tween) {
          tween.pause();
        }

        // Create electric effect at crow position BEFORE hurt animation
        const emitter = this.electricParticles.createEmitter({
          x: crow.x,
          y: crow.y,
          frame: { frames: [0, 1, 2, 3, 4, 5, 6, 7, 8], cycle: true },
          lifespan: 1000,
          scale: { start: 3, end: 1.5 },
          quantity: 1,
          frequency: 60,
          maxParticles: 9,
          alpha: { start: 1, end: 0 },
          blendMode: "ADD",
          rotate: { min: -180, max: 180 },
        });

        // Play zap sound when crow is hit
        this.sound.play("zapSound", { volume: 0.4 });

        // Play hurt animation
        crow.play("crow_hurt_anim");

        // Handle crow falling and destruction
        crow.once("animationcomplete", () => {
          // Stop and remove the emitter when crow starts falling
          emitter.stop();
          emitter.remove();

          crow.play("crow_fall_anim");
          crow.setVelocityY(500);

          // Rotate for falling effect
          this.tweens.add({
            targets: crow,
            angle: Phaser.Math.Between(-30, 30),
            duration: 300,
          });

          // Check if crow is off screen and destroy it
          const fallTimer = this.time.addEvent({
            delay: 100,
            callback: () => {
              if (crow.y > this.cameras.main.height + 100) {
                this.handleCrowDefeat(crow);
                fallTimer.remove();
              }
            },
            callbackScope: this,
            loop: true,
          });
        });
      }
    });

    // Clear input field
    this.answerInput = "";
    this.numpadDisplay.setText("");

    if (!matchFound && this.answerInput.length > 0) {
      this.missedAnswers++;
    }
  }

  private gameOver() {
    // Stop all timers
    this.timerEvents.forEach((timer) => timer.remove());

    // Stop all crows
    this.crows.getChildren().forEach((crow: any) => {
      crow.setVelocityX(0);
    });

    // Display game over text
    this.add
      .text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2,
        `GAME OVER\n\nFinal Score: ${this.score}\nCrows Defeated: ${this.crowsDefeated}\n\nClick to restart`,
        {
          fontSize: "48px",
          color: "#fff",
          stroke: "#000",
          strokeThickness: 5,
          align: "center",
        }
      )
      .setOrigin(0.5)
      .setDepth(100);

    // Restart game on click
    this.input.once("pointerdown", () => {
      this.scene.restart();
    });
  }

  private setupBackgrounds() {
    // Create and position all background layers
    const createBackground = (
      key: string,
      depth: number,
      scrollFactor: number = 1
    ) => {
      const bg = this.add.image(0, 0, key).setOrigin(0, 0);
      const scaleX = this.cameras.main.width / bg.width;
      const scaleY = this.cameras.main.height / bg.height;
      const scale = Math.max(scaleX, scaleY);
      bg.setScale(scale).setScrollFactor(scrollFactor);
      bg.setDepth(depth);
      return bg;
    };

    // Add backgrounds from back to front
    createBackground("background1", 0, 0); // Lowest depth, fixed (doesn't scroll)
    createBackground("background2", 10, 0.1); // Slight parallax effect
    createBackground("background3", 20, 0.2);
    createBackground("background4", 30, 0.3);
    createBackground("background5", 40, 0.4); // Highest background depth

    // Set default depth for game objects to be above all backgrounds
    this.player?.setDepth(50);
  }

  private setupTilemap() {
    // Create tilemap from loaded Tiled JSON data
    this.map = this.make.tilemap({ key: "ledge" });

    // Add tileset image - first param is the name used in Tiled
    this.tileset = this.map.addTilesetImage("MainLevBuild", "tiles")!;

    // Create layer from tilemap data
    if (this.tileset) {
      // First param is the layer name from Tiled
      this.layer = this.map.createLayer("Tile Layer 1", this.tileset, 0, -250)!;

      // Set depth to be above backgrounds but below game elements
      this.layer.setDepth(45);

      // Scale the tilemap up to 1.2
      this.layer.setScale(1.2);
    }
  }

  // Enhanced wave completion text effects
  private showWaveCompletionEffects(
    timeBonus: number,
    perfectBonus: number,
    waveBonus: number
  ) {
    const bonusTexts = [
      { text: `Wave ${this.currentWave} Complete!`, color: "#3498db" },
      { text: `Time Bonus: ${timeBonus}`, color: "#2ecc71" },
      { text: `Wave Bonus: ${waveBonus}`, color: "#e74c3c" },
    ];

    if (perfectBonus > 0) {
      bonusTexts.push({
        text: `Perfect Streak Bonus: ${perfectBonus}!`,
        color: "#f1c40f",
      });
    }

    let textsRemaining = bonusTexts.length;

    bonusTexts.forEach((textData, index) => {
      const yPos = this.cameras.main.height / 2 - 100 + index * 70;
      const bonusText = this.add
        .text(this.cameras.main.width / 2, yPos, textData.text, {
          fontSize: "52px",
          fontFamily: "Arial, sans-serif",
          color: textData.color,
          stroke: "#2c3e50",
          strokeThickness: 8,
          align: "center",
          shadow: {
            offsetX: 3,
            offsetY: 3,
            color: "#000",
            blur: 8,
            fill: true,
          },
        })
        .setOrigin(0.5)
        .setAlpha(0)
        .setDepth(201);

      // Enhanced text animation
      this.tweens.add({
        targets: bonusText,
        alpha: { from: 0, to: 1 },
        scale: { from: 0.5, to: 1 },
        y: yPos - 30,
        duration: 600,
        ease: "Back.easeOut",
        delay: index * 300,
        onComplete: () => {
          // Add subtle floating effect
          this.tweens.add({
            targets: bonusText,
            y: yPos - 40,
            duration: 1500,
            ease: "Sine.easeInOut",
            yoyo: true,
            repeat: 1,
          });

          // Fade out after delay
          this.time.delayedCall(2000, () => {
            this.tweens.add({
              targets: bonusText,
              alpha: 0,
              y: yPos - 60,
              scale: 0.8,
              duration: 500,
              ease: "Back.easeIn",
              onComplete: () => {
                bonusText.destroy();
                textsRemaining--;

                if (textsRemaining === 0) {
                  this.showNextWaveButton();
                }
              },
            });
          });
        },
      });
    });
  }

  // Add method to handle UI repositioning on resize
  private updateUIPosition() {
    const panels = [
      this.scoreText.parentContainer,
      this.waveText.parentContainer,
      this.waveStreakText.parentContainer,
    ];

    panels.forEach((panel, index) => {
      if (panel) {
        panel.x = this.cameras.main.width - 360;
        panel.y = 16 + index * 80;
      }
    });
  }
}
