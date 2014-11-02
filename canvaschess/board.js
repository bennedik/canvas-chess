// Global namespace
var CHESS = CHESS || {};

/**
Board module
**/
CHESS.Board = function (config) {
    var
        /**
        Constructor helper method for initializing a new board.
        @private
        **/
        init,

        /**
        Contains methods for responding to user interaction. Updates the model and the view.
        @private
        **/
        controller = {},

        /**
        Holds the internal state of the board.
        @private
        **/
        model = CHESS.engine.createPosition(),

        /**
        Contains methods for updating the user interface.
        @private
        **/
        view = {
            container: null,
            canvas: null,
            ctx: null,
            snapshot: null,
            snapshot_ctx: null,
            snapshot_img: new Image(),
            square_size: 80,
            square_color_light: '#ececd7',
            square_color_dark: '#7389b6',
            dragok: false,
            drag_piece: '',
            // Array position of piece being dragged
            drag_clear_i: 0,
            // Array position of piece being dragged
            drag_clear_j: 0,
            // Coordinate of the mouse/touch event
            left: 0,
            // Coordinate of the mouse/touch event
            top: 0,
            // Coordinate of the last draw of a dragged piece
            last_draw_left: 0,
            // Coordinate of the last draw of a dragged piece
            last_draw_top: 0,
            // Does the piece need cleared from the starting square at the start of a drag?
            piece_not_lifted: true,
            // The white pieces are at the bottom of the screen
            white_down: true,
            display_coordinates: true,
            highlight_move: false,
            show_row_col_labels: true,
            pieces: new Image()
        };

    /**
    Respond to touch-leave or touch-cancel.

    @param e - The event object.
    **/
    controller.myCancel = function (e) {
        e.preventDefault();
        view.dragok = false;
        view.drag_piece = '';
        view.left = 0;
        view.top = 0;
        view.takeSnapshot();
        view.refresh();
    };

    /**
    Respond to mouse-down or touch-start.

    @param e - The event object.
    **/
    controller.myDown = function (e) {
        var i,
            j,
            piece,
            piece_color,
            rect = view.canvas.getBoundingClientRect();
        if (model.active) {
            if (e.hasOwnProperty('clientX')) {
                // Mouse event
                view.left = e.clientX - rect.left;
                view.top = e.clientY - rect.top;
                view.canvas.style.cursor = 'move';
            } else if (e.hasOwnProperty('changedTouches')) {
                // Touch event
                view.left = e.changedTouches[0].pageX - rect.left;
                view.top = e.changedTouches[0].pageY - rect.top;
            } else {
                return;
            }

            i = parseInt(view.top / view.square_size, 10);
            j = parseInt(view.left / view.square_size, 10);

            // Flip board for black
            if (!view.white_down) {
                i = 7 - i;
                j = 7 - j;
            }

            if (i < 8) {
                // Dragging a piece on the board
                piece = model.position_array[i][j];
            } else {
                // Dragging a piece in the piece box
                if (model.mode === 'setup') {
                    piece = model.piecebox_array[i - 8][j];
                }
            }
            piece_color = piece.substr(0, 1);
            if (model.mode !== 'setup' && ((model.white_to_move && piece_color === 'b') || (!model.white_to_move && piece_color === 'w'))) {
                view.canvas.style.cursor = 'default';
                return;
            }

            if (piece !== '') {
                view.drag_clear_i = i;
                view.drag_clear_j = j;
                view.drag_piece = piece;
                view.dragok = true;
                view.takeSnapshot();
            } else {
                view.canvas.style.cursor = 'default';
            }
        }
    };

    /**
    Respond to mouse-move or touch-move. No relation to the touch-move rule in chess ;).

    @param e - The event object.
    **/
    controller.myMove = function (e) {
        e.preventDefault();
        var myview = view,
            i,
            j,
            ii,
            jj,
            piece,
            clip_start_x,
            clip_start_y,
            clip_width,
            clip_height,
            scale,
            scale_x,
            scale_y,
            draw_height,
            rect = myview.canvas.getBoundingClientRect();

        if (myview.dragok) {
            i = parseInt(myview.top / myview.square_size, 10);
            j = parseInt(myview.left / myview.square_size, 10);
            clip_start_x = (j - 1) * myview.square_size;
            clip_start_y = (i - 1) * myview.square_size;
            clip_width = myview.square_size * 3;
            clip_height = myview.square_size * 3;

            // Make sure the piece is over the board
            if (!(i < 0 || i > 7 || j < 0 || j > 7)) {
                if (clip_start_x < 0) {
                    clip_start_x = 0;
                }
                if (clip_start_y < 0) {
                    clip_start_y = 0;
                }
                if (clip_start_x + clip_width > myview.square_size * 8) {
                    clip_width = (myview.square_size * 8) - clip_start_x;
                }
                if (clip_start_y + clip_height > myview.square_size * 8) {
                    clip_height = (myview.square_size * 8) - clip_start_y;
                }
                // Clear the section of the board where the drag piece was drawn
                myview.ctx.drawImage(myview.snapshot, clip_start_x, clip_start_y, clip_width, clip_height, clip_start_x, clip_start_y, clip_width, clip_height);
            }
            // Update values
            if (e.hasOwnProperty('clientX')) {
                // Mouse event
                myview.left = e.clientX - rect.left;
                myview.top = e.clientY - rect.top;
            } else if (e.hasOwnProperty('changedTouches')) {
                // Touch event
                myview.left = e.changedTouches[0].pageX - rect.left;
                myview.top = e.changedTouches[0].pageY - rect.top;
            } else {
                return;
            }
            i = parseInt(myview.top / myview.square_size, 10);
            j = parseInt(myview.left / myview.square_size, 10);

            // Make sure the piece is over the board
            if (i < 0 || i > 7 || j < 0 || j > 7) {
                return;
            }

            // Highlight hover square
            myview.ctx.beginPath();
            if ((i + j) % 2 === 0) {
                myview.ctx.fillStyle = '#b4d990';
            } else {
                myview.ctx.fillStyle = '#85c249';
            }
            myview.ctx.rect(j * myview.square_size, i * myview.square_size, myview.square_size, myview.square_size);
            myview.ctx.fill();

            // Clear the piece from the starting square (first time only, in case a quick mouse move didn't allow the square to highlight, and never from piece box)
            if (myview.piece_not_lifted && myview.drag_clear_i < 8) {
                myview.piece_not_lifted = false;
                myview.ctx.beginPath();
                if ((myview.drag_clear_i + myview.drag_clear_j) % 2 === 0) {
                    myview.ctx.fillStyle = this.square_color_light;
                } else {
                    myview.ctx.fillStyle = this.square_color_dark;
                }
                ii = myview.drag_clear_i;
                jj = myview.drag_clear_j;
                if (!myview.white_down) {
                    ii = 7 - ii;
                    jj = 7 - jj;
                }
                myview.ctx.rect(jj * myview.square_size, ii * myview.square_size, myview.square_size, myview.square_size);
                myview.ctx.fill();
            }

            myview.ctx.save();
            scale = (myview.square_size / 55);
            myview.ctx.scale(scale, scale);
            // Draw any piece that was sitting on the hover square
            ii = i;
            jj = j;
            if (!myview.white_down) {
                ii = 7 - i;
                jj = 7 - j;
            }
            piece = model.position_array[ii][jj].substr(0, 2);
            if (piece !== '' && !(ii === myview.drag_clear_i && jj === myview.drag_clear_j)) {
                scale_x = parseInt((j * myview.square_size / scale), 10);
                scale_y = parseInt((i * myview.square_size / scale), 10);

                switch (piece) {
                case 'wk':
                    myview.ctx.drawImage(myview.pieces, 0, 0, 55, 55, scale_x, scale_y, 55, 55);
                    break;
                case 'wq':
                    myview.ctx.drawImage(myview.pieces, 55, 0, 55, 55, scale_x, scale_y, 55, 55);
                    break;
                case 'wr':
                    myview.ctx.drawImage(myview.pieces, 110, 0, 55, 55, scale_x, scale_y, 55, 55);
                    break;
                case 'wb':
                    myview.ctx.drawImage(myview.pieces, 160, 0, 55, 55, scale_x, scale_y, 55, 55);
                    break;
                case 'wn':
                    myview.ctx.drawImage(myview.pieces, 215, 0, 55, 55, scale_x, scale_y, 55, 55);
                    break;
                case 'wp':
                    myview.ctx.drawImage(myview.pieces, 270, 0, 55, 55, scale_x, scale_y, 55, 55);
                    break;
                case 'bk':
                    myview.ctx.drawImage(myview.pieces, 0, 55, 55, 55, scale_x, scale_y, 55, 55);
                    break;
                case 'bq':
                    myview.ctx.drawImage(myview.pieces, 55, 55, 55, 55, scale_x, scale_y, 55, 55);
                    break;
                case 'br':
                    myview.ctx.drawImage(myview.pieces, 110, 55, 55, 55, scale_x, scale_y, 55, 55);
                    break;
                case 'bb':
                    myview.ctx.drawImage(myview.pieces, 160, 55, 55, 55, scale_x, scale_y, 55, 55);
                    break;
                case 'bn':
                    myview.ctx.drawImage(myview.pieces, 215, 55, 55, 55, scale_x, scale_y, 55, 55);
                    break;
                case 'bp':
                    myview.ctx.drawImage(myview.pieces, 270, 55, 55, 55, scale_x, scale_y, 55, 55);
                    break;
                }
            }
            // Draw drag piece
            piece = myview.drag_piece.substr(0, 2);
            scale_x = parseInt(((myview.left - (myview.square_size / 2)) / scale), 10);
            scale_y = parseInt(((myview.top - (myview.square_size / 2)) / scale), 10);

            // Trim drawing region so it doesn't go into the piece box
            draw_height = 55;
            if (model.mode === 'setup' && myview.top > myview.square_size * 7.5) {
                draw_height = draw_height - ((myview.top - myview.square_size * 7.5) / scale);
            }

            switch (piece) {
            case 'wk':
                 myview.ctx.drawImage(myview.pieces, 0, 0, 55, 55, scale_x, scale_y, 55, draw_height);
                break;
            case 'wq':
                 myview.ctx.drawImage(myview.pieces, 55, 0, 55, 55, scale_x, scale_y, 55, draw_height);
                break;
            case 'wr':
                 myview.ctx.drawImage(myview.pieces, 110, 0, 55, 55, scale_x, scale_y, 55, draw_height);
                break;
            case 'wb':
                 myview.ctx.drawImage(myview.pieces, 160, 0, 55, 55, scale_x, scale_y, 55, draw_height);
                break;
            case 'wn':
                 myview.ctx.drawImage(myview.pieces, 215, 0, 55, 55, scale_x, scale_y, 55, draw_height);
                break;
            case 'wp':
                 myview.ctx.drawImage(myview.pieces, 270, 0, 55, 55, scale_x, scale_y, 55, draw_height);
                break;
            case 'bk':
                 myview.ctx.drawImage(myview.pieces, 0, 55, 55, 55, scale_x, scale_y, 55, draw_height);
                break;
            case 'bq':
                 myview.ctx.drawImage(myview.pieces, 55, 55, 55, 55, scale_x, scale_y, 55, draw_height);
                break;
            case 'br':
                 myview.ctx.drawImage(myview.pieces, 110, 55, 55, 55, scale_x, scale_y, 55, draw_height);
                break;
            case 'bb':
                 myview.ctx.drawImage(myview.pieces, 160, 55, 55, 55, scale_x, scale_y, 55, draw_height);
                break;
            case 'bn':
                 myview.ctx.drawImage(myview.pieces, 215, 55, 55, 55, scale_x, scale_y, 55, draw_height);
                break;
            case 'bp':
                 myview.ctx.drawImage(myview.pieces, 270, 55, 55, 55, scale_x, scale_y, 55, draw_height);
                break;
            }
            myview.ctx.restore();
        }
    };

    /**
    Respond to mouse-up or touch-end.

    @param e - The event object.
    **/
    controller.myUp = function (e) {
        var sq1,
            sq2,
            alpha_conversion = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
            i,
            j,
            xy1,
            xy2,
            rect = view.canvas.getBoundingClientRect(),
            drag_piece_temp;

        // Cannot move unless game is active and a piece has been selected
        if (model.active && view.dragok) {
            if (e.hasOwnProperty('clientX')) {
                // Mouse event
                i = parseInt((e.clientY - rect.top) / view.square_size, 10);
                j = parseInt((e.clientX - rect.left) / view.square_size, 10);
                view.canvas.style.cursor = 'default';
            } else if (e.hasOwnProperty('changedTouches')) {
                // Touch event
                i = parseInt((e.changedTouches[0].pageY - rect.top) / view.square_size, 10);
                j = parseInt((e.changedTouches[0].pageX - rect.left) / view.square_size, 10);
            } else {
                return;
            }

            // Flip board for black
            if (!view.white_down) {
                i = 7 - i;
                j = 7 - j;
            }

            // Hold the drag piece info
            drag_piece_temp = view.drag_piece;

            // End the drag
            view.dragok = false;
            view.drag_piece = '';
            view.left = 0;
            view.top = 0;
            view.piece_not_lifted = true;

            // Change position
            if (view.drag_clear_i >= 8) {
                sq1 = 'piecebox';
            } else {
                sq1 = alpha_conversion[view.drag_clear_j] + (8 - view.drag_clear_i);
            }

            if (i >= 8) {
                sq2 = 'piecebox';
            } else {
                sq2 = alpha_conversion[j] + (8 - i);
            }

            xy1 = CHESS.engine.getArrayPosition(sq1);
            xy2 = CHESS.engine.getArrayPosition(sq2);

            if (model.mode === 'setup') {
                if (sq1 !== sq2 && sq1 !== 'piecebox' && sq2 !== 'piecebox') {
                    model.position_array[xy2.substr(1, 1)][xy2.substr(0, 1)] = drag_piece_temp;
                    model.position_array[xy1.substr(1, 1)][xy1.substr(0, 1)] = '';
                } else {
                    if (sq1 === 'piecebox' && sq2 === 'piecebox') {
                        // Do nothing
                    } else if (sq1 === 'piecebox') {
                        model.position_array[xy2.substr(1, 1)][xy2.substr(0, 1)] = drag_piece_temp;
                    } else if (sq2 === 'piecebox') {
                        model.position_array[xy1.substr(1, 1)][xy1.substr(0, 1)] = '';
                    }
                }
            } else {
                model.move(sq1, sq2);
            }

            view.takeSnapshot();
            view.refresh();
        }
    };

    /**
    Resize the board.

    @param {number} [height=0] - The new height of the board.
    @param {number} [width=0] - The new width of the board.
    **/
    controller.resize = function (height, width) {
        var smaller_size = 0,
            rows = 8;

        // Clean
        height = height || 0;
        width = width || 0;
        height = parseInt(height, 10);
        width = parseInt(width, 10);

        // Attempt to fill the container if no values are found
        if (height === 0 || width === 0) {
            height = parseInt(window.getComputedStyle(view.canvas.parentNode, null).getPropertyValue('height'), 10);
            width = parseInt(window.getComputedStyle(view.canvas.parentNode, null).getPropertyValue('width'), 10);
        }
        smaller_size = (height < width ? height : width);
        if (model.mode === 'setup') {
            rows = 10;
        }
        view.square_size = (height < width ? parseInt(smaller_size / rows, 10) : parseInt(smaller_size / 8, 10));
        view.canvas.height = view.square_size * rows;
        view.canvas.width = view.square_size * 8;
    };

    /**
    Update the internal board with a new move.

    @param {string} sq1 - Current square (eg. e2).
    @param {string} sq2 - New square (eg. e4).
    **/
    model.move = function (sq1, sq2) {
        var pos = {
                position_array: CHESS.engine.clonePositionArray(this.position_array),
                white_to_move: this.white_to_move,
                en_passant: this.en_passant,
                active: this.active,
                gs_castle_kside_w: this.gs_castle_kside_w,
                gs_castle_qside_w: this.gs_castle_qside_w,
                gs_castle_kside_b: this.gs_castle_kside_b,
                gs_castle_qside_b: this.gs_castle_qside_b
            };
        if (this.last_move) {
            pos.last_move = {
                'sq1': this.last_move.sq1,
                'sq2': this.last_move.sq2
            };
        }
        if (!CHESS.engine.moveTemp(pos, sq1, sq2)) {
            view.takeSnapshot();
            view.refresh();
            return;
        }

        // Apply position
        this.position_array = CHESS.engine.clonePositionArray(pos.position_array);
        this.white_to_move = pos.white_to_move;
        this.en_passant = pos.en_passant;
        this.active = pos.active;
        this.gs_castle_kside_w = pos.gs_castle_kside_w;
        this.gs_castle_qside_w = pos.gs_castle_qside_w;
        this.gs_castle_kside_b = pos.gs_castle_kside_b;
        this.gs_castle_qside_b = pos.gs_castle_qside_b;
        this.moves += 1;
        if (pos.last_move) {
            this.last_move = {
                'sq1': pos.last_move.sq1,
                'sq2': pos.last_move.sq2
            };
        }
        view.takeSnapshot();
        view.refresh();

        if (!this.active) {
            return;
        }
    };

    /**
    Set the current position.

    @param {string} fen - FEN representation of the position.
    **/
    model.setPosition = function (fen) {
        CHESS.engine.setPosition(this, fen);
    };

    /**
    Create the canvas element and an image buffer.
    **/
    view.buildHtml = function (container) {
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'chessboard';
        this.canvas.setAttribute('tabindex', 0);
        this.ctx = this.canvas.getContext('2d');
        this.snapshot = document.createElement('canvas');
        if (container !== undefined) {
            document.getElementById(container).appendChild(this.canvas);
        }
    };

    /**
    Draw a piece to the image buffer.

    @param {string} piece - The piece to draw.
    @param {number} x - The horizontal position in pixels.
    @param {number} y - The vertical position in pixels.
    **/
    view.drawPiece = function (piece, x, y) {
        var scale_x,
            scale_y,
            scale = 1;
        this.snapshot_ctx.save();
        // 55 is the standard size of the piece image
        scale = this.square_size / 55;
        this.snapshot_ctx.scale(scale, scale);
        scale_x = x / scale;
        scale_y = y / scale;

        switch (piece) {
        case 'wk':
            this.snapshot_ctx.drawImage(this.pieces, 0, 0, 55, 55, scale_x, scale_y, 55, 55);
            break;
        case 'wq':
            this.snapshot_ctx.drawImage(this.pieces, 55, 0, 55, 55, scale_x, scale_y, 55, 55);
            break;
        case 'wr':
            this.snapshot_ctx.drawImage(this.pieces, 110, 0, 55, 55, scale_x, scale_y, 55, 55);
            break;
        case 'wb':
            this.snapshot_ctx.drawImage(this.pieces, 160, 0, 55, 55, scale_x, scale_y, 55, 55);
            break;
        case 'wn':
            this.snapshot_ctx.drawImage(this.pieces, 215, 0, 55, 55, scale_x, scale_y, 55, 55);
            break;
        case 'wp':
            this.snapshot_ctx.drawImage(this.pieces, 270, 0, 55, 55, scale_x, scale_y, 55, 55);
            break;
        case 'bk':
            this.snapshot_ctx.drawImage(this.pieces, 0, 55, 55, 55, scale_x, scale_y, 55, 55);
            break;
        case 'bq':
            this.snapshot_ctx.drawImage(this.pieces, 55, 55, 55, 55, scale_x, scale_y, 55, 55);
            break;
        case 'br':
            this.snapshot_ctx.drawImage(this.pieces, 110, 55, 55, 55, scale_x, scale_y, 55, 55);
            break;
        case 'bb':
            this.snapshot_ctx.drawImage(this.pieces, 160, 55, 55, 55, scale_x, scale_y, 55, 55);
            break;
        case 'bn':
            this.snapshot_ctx.drawImage(this.pieces, 215, 55, 55, 55, scale_x, scale_y, 55, 55);
            break;
        case 'bp':
            this.snapshot_ctx.drawImage(this.pieces, 270, 55, 55, 55, scale_x, scale_y, 55, 55);
            break;
        }
        this.snapshot_ctx.restore();
    };

    /**
    Redraw the board from the image buffer.
    **/
    view.refresh = function () {
        this.ctx.clearRect(0, this.square_size * 8, this.square_size * 8, this.square_size * 2);
        this.ctx.drawImage(this.snapshot, 0, 0);
    };

    /**
    Draw the board to an image buffer.
    **/
    view.takeSnapshot = function () {
        var i,
            j,
            ii,
            jj,
            x,
            y,
            piece,
            rows = 8,
            rowcol;

        // Prepare canvas for snapshot
        if (model.mode === 'setup') {
            rows = 10;
        }
        this.snapshot.width = this.square_size * 8;
        this.snapshot.height = this.square_size * rows;
        this.snapshot_ctx = this.snapshot.getContext('2d');

        // Draw chessboard
        this.snapshot_ctx.beginPath();
        this.snapshot_ctx.fillStyle = this.square_color_light;
        this.snapshot_ctx.rect(0, 0, this.square_size * 8, this.square_size * 8);
        this.snapshot_ctx.fill();
        this.snapshot_ctx.beginPath();
        this.snapshot_ctx.fillStyle = this.square_color_dark;
        for (y = 0; y < 4; y += 1) {
            for (x = 0; x < 4; x += 1) {
                this.snapshot_ctx.rect(x * (this.square_size * 2) + this.square_size, y * (this.square_size * 2), this.square_size, this.square_size);
            }
        }
        for (y = 0; y < 4; y += 1) {
            for (x = 0; x < 4; x += 1) {
                this.snapshot_ctx.rect(x * (this.square_size * 2), y * (this.square_size * 2) + this.square_size, this.square_size, this.square_size);
            }
        }
        this.snapshot_ctx.fill();

        // Draw row/column labels
        if (this.show_row_col_labels) {
            this.snapshot_ctx.font = '9px arial';
            for (y = 0; y < 8; y += 1) {
                if (this.white_down) {
                    rowcol = 8 - y;
                } else {
                    rowcol = y + 1;
                }
                this.snapshot_ctx.fillStyle = (y % 2 === 0 ? this.square_color_dark : this.square_color_light);
                this.snapshot_ctx.fillText(rowcol, 2, (y * this.square_size) + 10);
            }
            for (x = 0; x < 8; x += 1) {
                if (this.white_down) {
                    rowcol = String.fromCharCode(x + 97);
                } else {
                    rowcol = String.fromCharCode((7 - x) + 97);
                }
                this.snapshot_ctx.fillStyle = (x % 2 === 0 ? this.square_color_light : this.square_color_dark);
                this.snapshot_ctx.fillText(rowcol, (this.square_size * x) + this.square_size - 7, (this.square_size * 8) - 2);
            }
        }

        // Highlight last move, sq1
        if (this.highlight_move) {
            if (typeof model.last_move === 'object' && model.last_move.sq1 !== undefined) {
                x = model.last_move.sq1.substr(0, 1);
                y = model.last_move.sq1.substr(1, 1);
                if (!this.white_down) {
                    x = 7 - x;
                    y = 7 - y;
                }
                this.snapshot_ctx.lineWidth = 2;
                this.snapshot_ctx.strokeStyle = '#ff8d8d';
                this.snapshot_ctx.strokeRect(x * this.square_size, y * this.square_size, this.square_size, this.square_size);

                x = model.last_move.sq2.substr(0, 1);
                y = model.last_move.sq2.substr(1, 1);
                if (!this.white_down) {
                    x = 7 - x;
                    y = 7 - y;
                }
                this.snapshot_ctx.strokeRect(x * this.square_size, y * this.square_size, this.square_size, this.square_size);
            }
        }

        // Draw pieces
        for (i = 0; i < 8; i += 1) {
            for (j = 0; j < 8; j += 1) {
                if (!this.dragok || !(i === this.drag_clear_i && j === this.drag_clear_j)) {
                    piece = model.position_array[i][j].substr(0, 2);
                    // Flip board for black
                    ii = i;
                    jj = j;
                    if (!this.white_down) {
                        ii = 7 - i;
                        jj = 7 - j;
                    }
                    x = jj * this.square_size;
                    y = ii * this.square_size;
                    if (piece !== '') {
                        this.drawPiece(piece, x, y);
                    }
                }
            }
        }

        if (model.mode === 'setup') {
            // Draw piece box pieces
            for (i = 0; i < 2; i += 1) {
                for (j = 0; j < 8; j += 1) {
                    piece = model.piecebox_array[i][j].substr(0, 2);
                    x = j * this.square_size;
                    y = (i + 8) * this.square_size;
                    if (piece !== '') {
                        this.drawPiece(piece, x, y);
                    }
                }
            }
        }

        // Clear drag piece
        if (this.dragok) {
            i = this.drag_clear_i;
            j = this.drag_clear_j;
            if (!this.white_down) {
                i = 7 - this.drag_clear_i;
                j = 7 - this.drag_clear_j;
            }
            this.snapshot_ctx.beginPath();
            this.snapshot_ctx.fillStyle = this.square_color_dark;
            if ((i + j) % 2 === 0) {
                this.snapshot_ctx.fillStyle = this.square_color_light;
            }
            this.snapshot_ctx.rect(j * this.square_size, i * this.square_size, this.square_size, this.square_size);
            this.snapshot_ctx.fill();
        }
    };

    /**
    Draw the board in its current state.
    **/
    this.display = function () {
        view.takeSnapshot();
        view.refresh();
    };

    /**
    Flip the board.
    **/
    this.flip = function () {
        view.white_down = !view.white_down;
        view.takeSnapshot();
        view.refresh();
    };

    /**
    Get a reference to the canvas element.

    @returns {object} A reference to the canvas element.
    **/
    this.getCanvas = function () {
        return view.canvas;
    };

    /**
    Clear the board.
    **/
    this.positionClear = function () {
        model.position_array = [
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', '']
        ];
        model.last_move = {};
        model.en_passant = '';
        model.white_to_move = true;
        model.gs_castle_kside_w = true;
        model.gs_castle_qside_w = true;
        model.gs_castle_kside_b = true;
        model.gs_castle_qside_b = true;
        model.moves = 0;
        view.takeSnapshot();
        view.refresh();
    };

    /**
    Set the board to the starting position.
    **/
    this.positionStart = function () {
        model.position_array = [
            ['br', 'bn', 'bb', 'bq', 'bk', 'bb', 'bn', 'br'],
            ['bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp'],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp'],
            ['wr', 'wn', 'wb', 'wq', 'wk', 'wb', 'wn', 'wr']
        ];
        model.last_move = {};
        model.en_passant = '';
        model.white_to_move = true;
        model.gs_castle_kside_w = true;
        model.gs_castle_qside_w = true;
        model.gs_castle_kside_b = true;
        model.gs_castle_qside_b = true;
        model.moves = 0;

        view.takeSnapshot();
        view.refresh();
    };

    /**
    Resize the board.

    @param {number} [height=0] - The new height of the board.
    @param {number} [width=0] - The new width of the board.
    **/
    this.resize = function (height, width) {
        controller.resize(height, width);
        view.takeSnapshot();
        view.refresh();
    };

    /**
    Activate/Inactivate the board.

    @param {boolean} active - True or False.
    **/
    this.setActive = function (active) {
        model.active = (active === true);
    };

    /**
    Set the last move (for display purposes).

    @param {string} sq1 - Letter and number of the start square.
    @param {string} sq2 - Letter and number of the end square.
    **/
    this.setLastMove = function (sq1, sq2) {
        sq1 = CHESS.engine.getArrayPosition(sq1);
        sq2 = CHESS.engine.getArrayPosition(sq2);
        model.last_move = {'sq1': sq1, 'sq2': sq2};
    };

    /**
    Change the board mode.

    @param {string} mode - Mode determines the default settings.
    **/
    this.setMode = function (mode) {
        model.mode = mode;
        if (mode === 'setup') {
            model.active = true;
        }
        controller.resize(view.canvas.height, view.canvas.width);
        view.takeSnapshot();
        view.refresh();
    };

    /**
    Set the board to a new position.

    @param {string} fen - FEN representation of the new position.
    **/
    this.setPosition = function (fen) {
        model.setPosition(fen);
        view.takeSnapshot();
        view.refresh();
    };

    // See declaration comment
    init = function () {
        view.buildHtml(config.container);

        // Mouse and touch events
        view.canvas.onmousedown = controller.myDown;
        view.canvas.onmouseup = controller.myUp;
        view.canvas.onmousemove = controller.myMove;
        view.canvas.addEventListener('touchstart', controller.myDown, false);
        view.canvas.addEventListener('touchend', controller.myUp, false);
        view.canvas.addEventListener('touchmove', controller.myMove, false);
        view.canvas.addEventListener('touchleave', controller.myCancel, false);
        view.canvas.addEventListener('touchcancel', controller.myCancel, false);
        /*window.onresize = function () {
            // Use controller instead of board?
            api.resize(config.height, config.width);
        };*/

        view.highlight_move = (config.highlight_move === true ? true : false);
        view.show_row_col_labels = (config.show_row_col_labels === false ? false : true);
        view.square_color_light = (config.square_color_light ? config.square_color_light : view.square_color_light);
        view.square_color_dark = (config.square_color_dark ? config.square_color_dark : view.square_color_dark);
        model.mode = config.mode;
        model.active = true;

        if (config.fen) {
            model.setPosition(config.fen);
        } else {
            model.setPosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
        }

        controller.resize(config.height, config.width);

        // Preload pieces
        view.pieces.src = CHESS.config.library_path + '/img/pieces.png';
        view.pieces.onload = function () {
            view.takeSnapshot();
            view.refresh();
        };
    };

    init();
};