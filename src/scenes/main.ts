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
  private crowsDefeated: number = 0;

  // Import wizard
  private wizardIdle = "images/wizard/Wanderer Magican/Idle.png";
  private wizardAttack = "images/wizard/Wanderer Magican/Attack_1.png";

  // Import crow assets
  private crowFly = "images/crows/crow_fly_strip6.png";
  private crowHurt = "images/crows/crow_hurt_strip5.png";

  // Background layers
  private background1 = "images/level/Background1.png";
  private background2 = "images/level/Background2.png";
  private background3 = "images/level/Background3.png";
  private background4 = "images/level/Background4.png";
  private background5 = "images/level/Background5.png";
  private background6 = "images/level/Background6.png";

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
  private buttonSound = "sounds/buttonpress.mp3";
  private zapSound = "sounds/zap.mp3";
  private bgMusic = "sounds/music.mp3";

  // Bitmap font properties
  private bitmapFontTexture = "images/UI/goldFont.png"; // Placeholder URL
  private bitmapFontMap: { [key: string]: number } = {};
  private bitmapFontConfig = {
    characterWidth: 32,
    characterHeight: 32,
    chars:
      "^1234567890AaâBbCcDdEeFfGgHhIiJjKkLlMmNnÑñOoPpQqRrSsTtUuVvWwXxYyZz¡!¿?@^$&^^^^'^^,;.:/][()}{-=+x÷*^%^",
    //^ are unused characters
    spacing: { x: -10, y: 0 },
    startFrame: 7, // Skip the first 7 empty columns of characters
  };

  // UI assets
  private icons = "images/UI/UI_Platinum_C_NoBorder.png";
  private UI = "images/UI/platUI.png";

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
    this.load.image("background6", this.background6);
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
    this.load.spritesheet("electric", "images/particles/Electric.png", {
      frameWidth: 96,
      frameHeight: 96,
    });

    // Load sound effects and music
    this.load.audio("buttonSound", this.buttonSound);
    this.load.audio("zapSound", this.zapSound);
    this.load.audio("bgMusic", this.bgMusic);

    // Load bitmap font spritesheet directly with frame config
    this.load.spritesheet("bitmapFont", this.bitmapFontTexture, {
      frameWidth: this.bitmapFontConfig.characterWidth,
      frameHeight: this.bitmapFontConfig.characterHeight,
    });

    this.load.atlas("panels", this.UI, "images/UI/UI.json");

    this.load.spritesheet("icons", this.icons, {
      frameWidth: 32,
      frameHeight: 32,
    });
  }

  create() {
    // Set up layered backgrounds with different depths
    this.setupBackgrounds();

    // Start background musics
    const music = this.sound.add("bgMusic", { loop: true, volume: 0.5 });
    music.play();

    // Setup bitmap font before we need to use it
    this.setupBitmapFont();

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
    const uiContainer = this.add.container(100, 100).setDepth(100);

    // Create a single panel for score, wave and streak
    const statsPanel = this.add.container(this.cameras.main.width - 360, 16);
    const statsBG = this.add.sprite(0, 90, "panels", "bottom_left_element");
    statsBG.setScale(3, 2); // Make it taller to fit all three stats

    // Create all three text displays in the same panel
    this.scoreText = this.createUpdatableBitmapText("Score:0", -230, -50, 3);
    this.waveText = this.createUpdatableBitmapText("Wave:0", -230, 30, 3);
    this.waveStreakText = this.createUpdatableBitmapText(
      "Streak:0",
      -230,
      110,
      3
    );

    // Add all elements to the panel
    statsPanel.add([
      statsBG,
      this.scoreText,
      this.waveText,
      this.waveStreakText,
    ]);

    // Add panel to UI container
    uiContainer.add([statsPanel]);

    // Enhanced instructions text with better styling - replace with bitmap text
    const instructionsText = "MATH CROWS\n\nClick to start!";

    // Handle multiline text by splitting on newlines and creating multiple text objects
    const lines = instructionsText.split("\n");
    const lineHeight = 75; // Adjust based on your font size
    const instructionsContainer = this.add.container(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2
    );

    lines.forEach((line, index) => {
      const lineText = this.createMultilineBitmapText(
        line,
        0,
        index * lineHeight,
        5
      );
      // Center each line
      lineText.setX(-lineText.width / 2);
      instructionsContainer.add(lineText);
    });

    instructionsContainer.setDepth(100);

    // Add subtle floating animation to instructions
    this.tweens.add({
      targets: instructionsContainer,
      y: "+=20",
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Start game on click
    this.input.once("pointerdown", () => {
      instructionsContainer.destroy();
      this.createNumpad();
      this.startNextWave();
      this.sound.play("buttonSound", { volume: 0.5 });
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
  }

  private startNextWave() {
    this.currentWave++;
    this.crowsInWave = Math.min(this.currentWave * 3, 50);
    this.crowsRemainingInWave = this.crowsInWave;
    this.isWaveActive = true;
    this.waveText.setText(`Wave:${this.currentWave}`);
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
        this.scoreText.setText(`Score:${this.score}`);
        this.waveStreakText.setText(`Streak:${this.perfectWaveStreak}`);

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
    const problem = `${num1}x${num2}=?`;
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

    // Replace the problem text with bitmap text
    const textContainer = this.createBitmapText(problem, -80, -80, 2);

    // Add a subtle floating animation to the text
    this.tweens.add({
      targets: textContainer,
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
      .container(crow.x, crow.y + problemOffset, [textBg, textContainer])
      .setDepth(55);

    // Update the container position in update
    crow.setData("problemText", textContainer);
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
    // Create the main container for the numpad - moved higher up
    this.numpad = this.add.container(this.player.x, this.player.y - 300);
    this.numpad.setDepth(100);

    // Add main background for the entire calculator - expanded to fit all buttons
    const mainBg = this.add.sprite(0, -50, "panels", "bottom_left_element");
    mainBg.setScale(2, 3.5);
    this.numpad.add(mainBg);

    // Replace the numpad display with bitmap text
    const numpadDisplayContainer = this.createBitmapText("", -120, -180, 2);
    this.numpadDisplay = {
      setText: (newText: string) => {
        numpadDisplayContainer.removeAll(true);
        const newTextContainer = this.createBitmapText(newText, 0, 0, 2);
        // Center the text
        newTextContainer.setX(-newTextContainer.width / 2);
        newTextContainer
          .getAll()
          .forEach((child) => numpadDisplayContainer.add(child));
      },
    } as Phaser.GameObjects.Text;

    // Replace the numpad title with bitmap text
    const numpadTitleContainer = this.createBitmapText("INPUT", -110, -300, 3);

    // Add the display and title to the container
    this.numpad.add([numpadDisplayContainer, numpadTitleContainer]);

    // Create numpad buttons with all digits 1-9
    const buttonWidth = 62;
    const buttonSpacing = 12;
    const totalButtonWidth = buttonWidth + buttonSpacing;

    // Define the new numpad layout with all 9 digits
    const numpadLayout = [
      ["1", "2", "3"],
      ["4", "5", "6"],
      ["7", "8", "9"],
      ["<", "0", ">"],
    ];

    // Create all buttons according to layout
    for (let row = 0; row < numpadLayout.length; row++) {
      for (let col = 0; col < numpadLayout[row].length; col++) {
        const x = -totalButtonWidth + col * totalButtonWidth;
        const y = -80 + row * totalButtonWidth;
        const buttonValue = numpadLayout[row][col];

        // Frame index for the icon (1-9 for numbers, 3 for special buttons)
        let frameIndex = 0; // Default frame

        // For digit buttons 1-9, use the corresponding sprite frame
        if (buttonValue >= "1" && buttonValue <= "9") {
          frameIndex = parseInt(buttonValue);
        } else if (buttonValue === "0") {
          frameIndex = 10; // Assuming 0 is at index 10
        } else if (buttonValue === "<") {
          frameIndex = 101;
        } else if (buttonValue === ">") {
          frameIndex = 102;
        }

        // Create button background with the correct icon
        const button = this.add.sprite(x, y, "icons", frameIndex).setScale(2);

        // Make button interactive
        button.setInteractive();

        // Add click handler based on button value
        button.on("pointerdown", () => {
          if (buttonValue === ">") {
            this.checkAnswer();
          } else if (buttonValue === "<") {
            this.onNumpadDelete();
          } else {
            this.onNumpadButtonClick(buttonValue);
          }
        });

        // Add visual feedback
        button.on("pointerover", () => {
          button.alpha = 0.8;
        });

        button.on("pointerout", () => {
          button.alpha = 1;
        });

        // Add to container
        this.numpad.add(button);
      }
    }
  }

  private onNumpadButtonClick(value: string) {
    // Play button sound
    this.sound.play("buttonSound", { volume: 0.5 });

    if (this.answerInput.length < 8) {
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
    createBackground("background6", 50, 0.5); // Highest background depth
    // Set default depth for game objects to be above all backgrounds
    this.player?.setDepth(50);
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
      const textContainer = this.createBitmapText(textData.text, 0, 0, 4.5); // Increased scale from 1.5 to 2.5

      // Center the text horizontally by positioning at screen center
      textContainer.setX(
        this.cameras.main.width / 2 - textContainer.width / 2 - 500
      );
      textContainer.setY(yPos);
      textContainer.setDepth(201);

      // Enhanced text animation
      this.tweens.add({
        targets: textContainer,
        alpha: { from: 0, to: 1 },
        scale: { from: 0.5, to: 1 },
        y: yPos - 30,
        duration: 600,
        ease: "Back.easeOut",
        delay: index * 300,
        onComplete: () => {
          // Add subtle floating effect
          this.tweens.add({
            targets: textContainer,
            y: yPos - 40,
            duration: 1500,
            ease: "Sine.easeInOut",
            yoyo: true,
            repeat: 1,
          });

          // Fade out after delay
          this.time.delayedCall(2000, () => {
            this.tweens.add({
              targets: textContainer,
              alpha: 0,
              y: yPos - 60,
              scale: 0.8,
              duration: 500,
              ease: "Back.easeIn",
              onComplete: () => {
                textContainer.destroy();
                textsRemaining--;

                // Create Next Wave button after all texts have faded
                if (textsRemaining === 0) {
                  this.createNextWaveButton();
                }
              },
            });
          });
        },
      });
    });
  }

  // Add this new method to create the Next Wave button
  private createNextWaveButton() {
    // Create button background

    const buttonText = this.createBitmapText(
      "CLICK TO START NEXT WAVE",
      this.cameras.main.width / 2 - 700,
      this.cameras.main.height / 2 - 100,
      4
    );

    // Make button interactive
    buttonText.setInteractive();

    // Add hover effects
    buttonText.on("pointerover", () => {
      buttonText.setScale(4.2);
      this.tweens.add({
        targets: [buttonText],
        alpha: 0.8,
        duration: 100,
      });
    });

    buttonText.on("pointerout", () => {
      buttonText.setScale(4);
      this.tweens.add({
        targets: [buttonText],
        alpha: 1,
        duration: 100,
      });
    });

    this.input.once("pointerdown", () => {
      buttonText.destroy();
      this.startNextWave();
      this.sound.play("buttonSound", { volume: 0.5 });
    });

    // Add entrance animation
    buttonText.setAlpha(0);
    this.tweens.add({
      targets: [buttonText],
      alpha: 1,
      scale: { from: 0.5, to: buttonText.scale },
      duration: 500,
      ease: "Back.easeOut",
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

  // Add after other methods
  private setupBitmapFont() {
    // Create character mapping lookup table
    const chars = this.bitmapFontConfig.chars;
    const firstRowEndIndex = ".1234567890AaaBbCc".length; // End of first row
    const charsPerRow = 18; // Approximate number of characters per row after skipping empty frames
    const rowOffset = 6 * 32; // Skip 6 full rows (each row is 32 pixels high)

    for (let i = 0; i < chars.length; i++) {
      if (i < firstRowEndIndex) {
        // First row characters - add rowOffset to skip 6 rows
        this.bitmapFontMap[chars[i]] =
          i + this.bitmapFontConfig.startFrame + rowOffset;
      } else {
        // Second row and beyond - add an offset to jump to next row
        const rowNumber = Math.floor(i / charsPerRow);
        const extraOffset = rowNumber * (32 - charsPerRow); // Add extra frames to skip to next row
        this.bitmapFontMap[chars[i]] =
          i + this.bitmapFontConfig.startFrame + rowOffset + extraOffset;
      }
    }
  }

  private createBitmapText(
    text: string,
    x: number,
    y: number,
    scale: number = 1
  ) {
    // Return a Phaser Text object with no content as a placeholder
    // that will contain our bitmap sprites
    const container = this.add.container(x, y).setDepth(100);

    // Store the text in a custom property for reference
    container.setData("text", text);

    // Render each character from the bitmap font
    let xOffset = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (char === " ") {
        // Handle space character
        xOffset += this.bitmapFontConfig.characterWidth * scale;
        continue;
      }

      const frameIndex = this.bitmapFontMap[char];
      if (frameIndex !== undefined) {
        const charSprite = this.add
          .sprite(xOffset, 0, "bitmapFont", frameIndex)
          .setScale(scale)
          .setOrigin(0, 0); // Set origin to top-left

        container.add(charSprite);
        xOffset +=
          (this.bitmapFontConfig.characterWidth * 0.68 +
            this.bitmapFontConfig.spacing.x) *
          scale;
      }
    }

    return container;
  }

  // Create a utility function to update text in bitmap containers
  private updateBitmapText(
    container: Phaser.GameObjects.Container,
    newText: string
  ) {
    const scale = container.first
      ? (container.first as Phaser.GameObjects.Sprite).scaleX
      : 1;

    // Clear existing sprites
    container.removeAll(true);

    // Add new sprites for the updated text
    let xOffset = 0;
    for (let i = 0; i < newText.length; i++) {
      const char = newText[i];

      if (char === " ") {
        // Handle space character
        xOffset += this.bitmapFontConfig.characterWidth * scale;
        continue;
      }

      const frameIndex = this.bitmapFontMap[char];
      if (frameIndex !== undefined) {
        const charSprite = this.add
          .sprite(xOffset, 0, "bitmapFont", frameIndex)
          .setScale(scale)
          .setOrigin(0, 0);

        container.add(charSprite);
        // Match the spacing from createBitmapText (0.68 instead of 0.5)
        xOffset +=
          (this.bitmapFontConfig.characterWidth * 0.68 +
            this.bitmapFontConfig.spacing.x) *
          scale;
      }
    }

    // Update stored text
    container.setData("text", newText);

    return container;
  }

  // Use this wrapper for Text objects that need to be updated
  private createUpdatableBitmapText(
    text: string,
    x: number,
    y: number,
    scale: number = 1
  ) {
    // Create a container to hold everything
    const container = this.add.container(x, y);

    // Create bitmap text inside the container
    const bitmapContainer = this.createBitmapText(text, 0, 0, scale);
    container.add(bitmapContainer);

    // Create an invisible text object with the proper methods for compatibility
    const textObj = this.add.text(0, 0, "", {
      fontSize: "1px", // Minimal size
      color: "#00000000", // Transparent
    });
    container.add(textObj);

    // Store reference and override setText
    container.setData("bitmapContainer", bitmapContainer);
    container.setData("textObj", textObj);

    // Add setText method to the container
    (container as any).setText = (newText: string) => {
      this.updateBitmapText(bitmapContainer, newText);
      return container;
    };

    return container as unknown as Phaser.GameObjects.Text;
  }

  // For multiline text like instructions
  private createMultilineBitmapText(
    text: string,
    x: number,
    y: number,
    scale: number = 1
  ) {
    const container = this.add.container(x, y);
    const lines = text.split("\n");
    const lineHeight = this.bitmapFontConfig.characterHeight * scale * 1.2;

    lines.forEach((line, index) => {
      const lineContainer = this.createBitmapText(
        line,
        0,
        index * lineHeight,
        scale
      );
      // Center the line
      const lineWidth = lineContainer.getBounds().width;
      lineContainer.setX(-lineWidth / 2);
      container.add(lineContainer);
    });

    return container;
  }
}
