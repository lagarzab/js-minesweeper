export default (p5) => {
    const isBetween = (val, low, high) => {
        return low <= val && val <= high
    }

    const generateRandom = (min, max) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    class Game {
        static PLAY = 0
        static WON = 1
        static LOST = 2
        static EASY = 0
        static MEDIUM = 1
        static HARD = 2
        constructor (difficulty = Game.Medium) {
            this.size = {}
            this.startNewGame(difficulty)
        }

        startNewGame (difficulty) {
            tiles = []
            explosions = []
            this.status = Game.PLAY
            this.setDifficultySize(difficulty)
            p5.createCanvas(this.size.width, this.size.height)
            grid = new Grid(this.size.width, this.size.height)
            this.draw()
        }

        setDifficultySize (difficulty = this.difficulty) {
            this.difficulty = difficulty
            if (this.difficulty === Game.EASY) {
                this.size.width = 400
                this.size.height = 200
            }
            if (this.difficulty === Game.MEDIUM) {
                this.size.width = 800
                this.size.height = 400
            }
            if (this.difficulty === Game.HARD) {
                this.size.width = 1200
                this.size.height = 600
            }
        }

        reset(difficulty = this.difficulty) {
            this.startNewGame(this.difficulty = difficulty)
        }

        draw () {
            grid.build()
            grid.draw()
        }
    }

    class Grid {
        constructor(wide, high) {
            if (typeof wide === 'string') wide = parseInt(wide)
            if (typeof high === 'string') high = parseInt(high)

            this.offset = {
                x: 0,
                y: 0
            }

            this.coords = {
                top: {
                    left: {
                        x: 0,
                        y: 0
                    },
                    right: {
                        x: 0,
                        y: 0
                    }
                }
            }

            this.size = {
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                wide: 0,
                high: 0,
                width: 0,
                height: 0
            }

            this.tileCount = 0
            this.dangerCount = 0
            this.exposedCount = 0

            this.size.wide = Math.floor((wide - tileSize) / tileSize)
            this.size.width = this.size.wide * tileSize
            this.offset.x = Math.floor((wide - this.size.width) / 2)

            this.size.high = Math.floor((high - tileSize) / tileSize)
            this.size.height = this.size.high * tileSize
            this.offset.y = Math.floor((high - this.size.height) / 2)

            this.size.top = this.offset.y
            this.size.bottom = this.offset.y + this.size.height
            this.size.left = this.offset.x
            this.size.right = this.offset.x + this.size.width

            this.tileCount = this.size.wide * this.size.high
            for (let row = 0; row < this.size.high; row++) {
                tiles.push([])
                for (let col = 0; col < this.size.wide; col++) {
                    tiles[row].push([])
                }
            }
        }

        checkClick(mX, mY) {
            // console.log('x:', mX, this.size.left, this.size.right)
            // console.log('y:', mY, this.size.top, this.size.bottom)
            if (isBetween(mX, this.size.left, this.size.right) &&
                isBetween(mY, this.size.top, this.size.bottom)) {
                return true
            }
            return false
        }

        setDangerousTiles() {

            let numOfDangers = Math.ceil(this.tileCount / 15)
            this.dangerCount = numOfDangers

            while (numOfDangers > 0) {
                let col = generateRandom(0, this.size.wide - 1)
                let row = generateRandom(0, this.size.high - 1)
                if (!tiles[row][col].isDangerous) {
                    tiles[row][col].makeDangerous()
                    numOfDangers--
                }
            }
            this.setDangerCounts()
        }

        setDangerCounts() {
            tiles.forEach(row => {
                row.forEach(tile => {
                    !tile.isDangerous ? tile.setDangerCount() : null
                })
            })
        }

        exposeAllTiles() {
            tiles.forEach(row => {
                row.forEach(tile => {
                    if (!tile.exposed) {
                        tile.exposeTile()
                    }
                })
            })
        }

        build() {
            let colIndex = 0
            let rowIndex = 0
            for (let row = this.offset.y; row < this.size.height; row += tileSize) {
                for (let col = this.offset.x; col < this.size.width; col += tileSize) {
                    let tile = new Tile(rowIndex, colIndex)
                    tiles[rowIndex][colIndex] = tile
                    colIndex++
                }
                rowIndex++
                colIndex = 0
            }
            this.setDangerousTiles()
            // this.exposeAllTiles()
        }

        draw() {
            tiles.forEach(rows => {
                rows.forEach(tile => {
                    tile.draw()
                })
            })
        }
    }

    class Tile {
        // constructor (xTopLeft, yTopLeft) {
        //     this.x = {
        //         min: xTopLeft,
        //         max: xTopLeft + tileSize
        //     }
        //     this.y = {
        //         min: yTopLeft,
        //         max: yTopLeft + tileSize
        //     }
        constructor(rowNumber, columnNumber) {
            this.column = columnNumber
            this.row = rowNumber
            this.coords = {
                row: this.row,
                column: this.column
            }
            this.x = {
                min: grid.offset.x + (columnNumber * tileSize),
                max: grid.offset.x + (columnNumber * tileSize) + tileSize,
                center: (((grid.offset.x + (columnNumber * tileSize)) * 2) + tileSize) / 2
            }
            this.y = {
                min: grid.offset.y + (rowNumber * tileSize),
                max: grid.offset.y + (rowNumber * tileSize) + tileSize,
                center: (((grid.offset.y + (rowNumber * tileSize)) * 2) + tileSize) / 2
            }
            this.color = 180

            this.isDangerous = false
            this.isFlagged = false
            this.dangersNearby = false
            this.nearbyDangers = 0
            this.exposed = false
        }

        makeDangerous() {
            this.isDangerous = true
        }

        setFlag(bool = true) {
            this.isFlagged = bool
        }

        exposeTile() {
            if (!this.exposed) {
                this.exposed = true
                grid.exposedCount++
                if (!this.nearbyDangers && !this.isDangerous && game.status === Game.PLAY) {
                    this.exposeNearbyTiles()
                } else if (this.isDangerous) {
                    let x = this.x.center
                    let y = this.y.center
                    if (game.status !== Game.LOST) {
                        x = p5.mouseX
                        y = p5.mouseY
                    }
                    game.status = Game.LOST
                    exposedDanger = true
                    explosions.push(new Explosion(x, y))
                    explosions[explosions.length-1].detonate()
                } else if (grid.exposedCount + grid.dangerCount === grid.tileCount) {
                    game.status = Game.WON
                }
            }
        }

        wasClicked(mX, mY) {
            return isBetween(mX, this.x.min, this.x.max) &&
                isBetween(mY, this.y.min, this.y.max)
        }

        setDangerCount() {
            // console.log('a')
            for (let row = -1; row < 2; row++) {
                // console.log('reviewing row:', row)
                for (let col = -1; col < 2; col++) {
                    // console.log('reviewing col:', row, col)
                    if (row === 0 && col === 0) {
                        // console.log('returning...')
                        continue
                    }
                    let tempRow = this.row + row
                    let tempCol = this.column + col
                    if (tempRow >= 0 && tempRow < grid.size.high &&
                        tempCol >= 0 && tempCol < grid.size.wide) {
                        // console.log('tile relativity', tempRow, tempCol)
                        // console.log('e', tempRow >= 0 && tempRow < grid.size.high, tempCol >= 0 && tempCol < grid.size.wide)
                        if (tiles[tempRow][tempCol].isDangerous) {
                            //console.log('f')
                            this.nearbyDangers++
                        }
                    }
                }
            }
        }

        exposeNearbyTiles() {
            // console.log('a')
            for (let row = -1; row < 2; row++) {
                // console.log('reviewing row:', row)
                for (let col = -1; col < 2; col++) {
                    // console.log('reviewing col:', row, col)
                    if (row === 0 && col === 0) {
                        // console.log('returning...')
                        continue
                    }
                    let tempRow = this.row + row
                    let tempCol = this.column + col
                    if (tempRow >= 0 && tempRow < grid.size.high &&
                        tempCol >= 0 && tempCol < grid.size.wide) {
                        // console.log('tile relativity', tempRow, tempCol)
                        // console.log('e', tempRow >= 0 && tempRow < grid.size.high, tempCol >= 0 && tempCol < grid.size.wide)
                        if (!tiles[tempRow][tempCol].exposed) {
                            //console.log('f')
                            tiles[tempRow][tempCol].exposeTile()
                        }
                    }
                }
            }
        }

        draw() {
            p5.fill(255)
            if (!this.exposed) {
                // p5.fill(this.color)
                p5.fill([0,255,0])
            } else if (this.isDangerous) {
                p5.fill([255,0,0])
            }
            p5.square(this.x.min, this.y.min, tileSize)

            if (this.exposed && this.nearbyDangers) {
                p5.fill(0)
                p5.textSize(18)
                p5.textAlign(p5.CENTER, p5.CENTER)
                p5.text(this.nearbyDangers, this.x.min + tileSize / 2, this.y.min + tileSize / 2)
            }
        }
    }

    class Explosion {
        static blastRadius

        constructor(x, y) {
            this.startX = x
            this.startY = y
            this.radius = 0
            this.color = [128, 0, 200]
            this.expansionRate = (game.difficulty + 1) * 3
            this.triggered = false
        }

        detonate() {
            this.triggered = true
            this.radius = 3
            this.expand()
        }

        expand () {
            if (!Explosion.blastRadius) {
                Explosion.blastRadius = game.size.width
            }
            if (this.radius < Explosion.blastRadius &&
                this.triggered &&
                grid.tileCount !== grid.exposedCount) {

                this.radius += this.expansionRate
                tiles.forEach(rows => rows.forEach(tile => {
                    let dist = Math.floor(p5.dist(this.startX, this.startY, tile.x.center, tile.y.center))
                    let d = this.radius + tileSize/2
                    if (dist < d) {
                        tile.exposeTile()
                    }
                }))

            }
            else {
                this.radius = 0
                this.triggered = false
            }

            p5.push()
            p5.stroke(this.color)
            p5.noFill()
            p5.ellipse(this.startX, this.startY, this.radius * 2, this.radius * 2)
            p5.pop()
        }
    }

    let game
    let tileSize = 40
    let tiles = []
    let grid
    let exposedDanger = false
    let explosions = []
    let selectedDifficulty = Game.HARD

    p5.setup = () => {
        // put setup code here
        game = new Game(selectedDifficulty)
    }

    p5.draw = () => {
        p5.background(255)
        grid.draw()
        if (game.status === Game.WON) {
            p5.fill([0, 255, 0])
            p5.text('GAME WON!!!!', 200, 200)
        } else if (game.status === Game.LOST) {
            p5.fill([255, 0, 0])
            p5.text('GAME OVER!', 200, 200)
        }
        if (exposedDanger === true) {
            let e = explosions.length - 1
            while (e >= 0 && grid.tileCount != grid.exposedCount) {
                explosions[e].expand()
                if (!explosions[e].triggered) {
                    explosions = explosions.splice(e, 1)
                }
                e--
            }
        }
    }

    p5.mouseClicked = () => {
        if (game.status === Game.PLAY && grid.checkClick(p5.mouseX, p5.mouseY)) {
            let tile = tiles.reduce((tObj, row, rIndex) => {
                if (isBetween(p5.mouseY, row[0].y.min, row[0].y.max)) {
                    row.forEach((t, cIndex) => {
                        if (isBetween(p5.mouseX, t.x.min, t.x.max)) {
                            tObj = t
                        }
                    })
                }
                return tObj
            }, {})

            tile.exposeTile()
        }
        else if (game.status !== Game.PLAY) {
            game.startNewGame(selectedDifficulty)
        }
    }
}
