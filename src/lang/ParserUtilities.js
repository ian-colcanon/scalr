/* global Literal BinaryExpr UnaryExpr ParsingError Point BoundStatement Rectangle Circle Ellipse Console For Comparison Assignment Variable TimeStep Color, Text, Polyline, Line, TrigExpr, Polygon, PrintStatement, Scope*/

var Parser = {
    tokens: [],
    current: 0,
    scope: undefined,

    init: function (tokens) {
        this.current = 0;
        this.tokens = tokens;
        this.scope = new Scope(null);
    },

    isAtEnd: function () {
        return this.peek().type == 'EOF';
    },

    previous: function () {
        if (this.current - 1 < 0 || this.current - 1 >= this.tokens.length) {
            return null;
        }
        return this.tokens[this.current - 1];
    },

    has: function (item) {
        return item == this.tokens[this.current].text;
    },

    peek: function () {
        return this.tokens[this.current];
    },

    peekNext: function () {
        if (this.current + 1 >= this.tokens.length) return undefined;
        return this.tokens[this.current + 1];
    },

    advance: function () {
        if (!this.isAtEnd()) this.current++;
        return this.previous();
    },

    consume: function () {
        if (arguments.length == 0) return false;

        for (var i = 0; i < arguments.length; ++i) {
            if (this.check(arguments[i])) return this.advance();
        }

        var message;

        switch (arguments[arguments.length - 1]) {
            case 'ID':
                message = 'Expected an identifier.';
                break;
            case 'UNARY':
                message = 'Expected a unary operator.';
                break;
            default:
                message = "Expected \'" + arguments[arguments.length - 1] + '\'';
                break;
        }

        throw new ParsingError(this.peek().line, message);
    },

    check: function (id) {
        if (this.isAtEnd()) return false;
        return (this.peek().type == id) || (this.peek().text == id);
    },

    match: function () {
        if (arguments.length == 0) return false;

        for (var i = 0; i < arguments.length; i++) {
            var tokenID = arguments[i];
            if (this.check(tokenID)) {
                this.advance();
                return true;
            }

        }

        return false;
    },

    eval: function () {
        try {
            var result = this.expression();
        } catch (RuntimeError) {
            RuntimeError.printMessage();
        }
        Console.log(result.eval());
    },

    expression: function () {
        return this.assignment();
    },

    grouping: function () {
        if (this.match('(')) {
            var expr = this.expression();
            this.consume(')');
            return expr;
        } else {
            throw new ParsingError(this.previous.line, "Expected \')\'");
        }
    },

    assignment: function () {
        var left = this.comparison();

        while (this.match('=', '|=', '-=', '+=')) {
            var operator = this.previous();

            if (!(left instanceof Variable)) {
                throw new ParsingError(this.previous().line, "An identifier cannot be assigned to an expression.");
            } else {
                var expr;
                if (this.match('SHAPE')) {
                    expr = this.shape(this.previous());
                } else {
                    expr = this.expression();
                }
                return new Assignment(left, operator, expr);
            }

        }
        return left;
    },


    comparison: function () {
        var left = this.additive();
        while (this.match('!=', '==', '<=', '>=', '>', '<')) {
            var operator = this.previous().text;
            var right = this.additive();
            left = new Comparison(left, operator, right);
        }
        return left;
    },

    additive: function () {
        var left = this.multiplicative();
        while (this.match('+', '-')) {
            var operator = this.previous().text;
            var right = this.multiplicative();
            left = new BinaryExpr(left, operator, right);
        }

        return left;
    },

    multiplicative: function () {
        var left = this.exponential();
        while (this.match('*', '/', '%')) {
            var operator = this.previous().text;
            var right = this.exponential();
            left = new BinaryExpr(left, operator, right);
        }

        return left;

    },

    exponential: function () {
        var left = this.unary();

        while (this.match('^')) {
            var operator = this.previous().text;
            var right = this.atom();
            left = new BinaryExpr(left, operator, right);
        }

        return left
    },

    unary: function () {
        if (this.match('++', '--')) {
            var operator = this.previous();
            var right;

            right = this.consume('ID');
            return new UnaryExpr(operator, right, this.scope);
        }
        return this.atom();
    },

    atom: function () {
        var token = this.advance();

        switch (token.type) {
            case 'ID':
                switch (this.peek().text) {
                    case '++':
                    case '--':
                        return new UnaryExpr(this.advance(), token, this.scope);
                    case '.':
                        this.advance();
                        var reference = this.consume('ID', 'ATTRIBUTE');
                        return new Variable(token, reference, this.scope);
                    default:
                        return new Variable(token, null, this.scope);
                }

            case 'KEY':
                switch (token.text) {

                    case 'rgb':
                        return this.color();
                    case 'sin':
                    case 'cos':
                    case 'tan':
                        var right = this.grouping();
                        return new TrigExpr(token, right);
                    case 'pi':
                        return new Literal(Math.PI);
                    case 'tau':
                        return new Literal(2 * Math.PI);
                }
                break;
            case 'INTEGER':
                return new Literal(parseInt(this.previous().text));
            case 'REAL':
                return new Literal(parseFloat(this.previous().text));
            case 'STRING':
                return new Literal(this.previous().text);
            case 'BOOLEAN':
                return new Literal((this.previous().text == 'true' ? true : false));
            case 'OP':
                switch (token.text) {

                    case '(':
                        var inner = this.expression();
                        this.consume(')');
                        return inner;
                    case '!':
                    case '++':
                    case '--':
                        return new UnaryExpr(token, this.advance(), this.scope);
                }
                break;
            case 'T':
                return new Variable(token, null, this.scope);
            default:
                throw new ParsingError(token.line, "Missing or unrecognizeable expression.");
        }
    },

    shape: function (token) {

        switch (token.text) {
            case 'rect':
                return this.rectStatement();
            case 'circle':
                return this.circleStatement();
            case 'ellipse':
                return this.ellipseStatement();
            case 'text':
                return this.textStatement();
            case 'line':
                return this.lineStatement();
            case 'polygon':
                return this.polyStatement(token.text);
            case 'polyline':
                return this.polyStatement(token.text);
        }

    },

    color: function () {
        this.consume('(');

        var r = this.expression();
        this.consume(',');

        var g = this.expression();
        this.consume(',');

        var b = this.expression();
        this.consume(')');

        return new Color(r, g, b);

    },

    parse: function () {
        var program = [];
        var read = undefined;

        while (!this.isAtEnd()) {
            read = this.statement();
            if (read != undefined) {
                program.push(read);

                if (!(read instanceof Grouping) && !this.match('\\n') && this.peek().type != 'EOF') {
                    this.consume(';')
                }
            }

        }

        return program;

    },

    statement: function () {
        
        var baseline = (this.peek().type == 'INDENT' ? this.advance().num : 0);
        var token = this.peek();
        
        var expr;

        switch (token.type) {

            case 'INTEGER':
                expr = this.expression();
                return this.timestep(expr, baseline);

            case 'ID':
                expr = this.expression();
                if (expr instanceof Assignment || expr instanceof UnaryExpr) {
                    return expr;
                } else {
                    throw new ParsingError(token.line, "Invalid statement.");
                }

            case 'T':
                if (this.peekNext().type != 'L_LIMIT' && this.peekNext().type != 'R_LIMIT') {
                    expr = this.expression();
                    if (expr instanceof Assignment || expr instanceof UnaryExpr) {
                        return expr;
                    } else {
                        throw new ParsingError(token.line, "Invalid statement.");
                    }
                } else {
                    return this.timestep(this.advance(), baseline);
                }
            case 'KEY':
                this.advance();
                switch (token.text) {
                    case 'print':
                        return this.printStatement();

                    case 'bounds':
                        return this.boundStatement();

                    case 'if':
                        return this.ifStatement(baseline);

                    case 'for':
                        return this.forStatement(baseline);

                    case 'draw':
                        return this.drawStatement();

                    default:
                        throw new ParsingError(token.line, 'Keyword \'' + token.text + '\' must be used within an expression or statement.');

                }

            case 'OP':

                switch (token.text) {
                    case '~':
                        this.advance();
                        var statement = this.statement();
                        statement.setGlobal(true);
                        return statement;
                    case '++':
                    case '--':
                    case '!':
                        return this.expression();
                }
                break;

            default:
                this.synchronize();
                break;
        }
    },

    synchronize: function () {
        this.advance();

        while (!this.isAtEnd()) {
            if (this.previous().type == 'NEWLINE' && this.peek().type != 'NEWLINE') {
                return;
            }
            switch (this.previous().type) {
                case 'INTEGER':
                case 'ID':
                case 'T':
                case 'OP':
                    return;
            }

            this.advance();
        }
    },


    globalStatement: function () {
        var expr;
        switch (this.peek().type) {
            case 'SHAPE':
                return new GlobalStatement(this.shape());

            case 'ID':
                expr = this.expression();
                if (!(expr instanceof Assignment)) throw new ParsingError(this.peek().line, 'Expected an non-unary assignment.');
                return expr;

            case 'ATTRIBUTE':
                var attr = this.advance();
                this.consume('=');
                expr = this.expression();
                return new GlobalStyle(attr, expr);

            default:
                throw new ParsingError(this.peek().line, 'Invalid global statement.');

        }
    },

    block: function (baseline, givenScope) {
        var statements = [];
        
        var initialScope = this.scope;
        
        //If a scope has been passed as a parameter, apply it to the inner statements. This allows TimeSteps to control the value of 't', a function which is not needed for any other enclosure.
        
        //A null value must be passed if a scope is not specified.
        this.scope = (givenScope == null ? new Scope() : givenScope);
        this.scope.superScope = initialScope;

        while (!this.isAtEnd()) {
            
            if (this.peek().type == 'INDENT' && this.peek().num > baseline) {
                var temp = this.statement();

                temp != undefined ? statements.push(temp) : null;

                if (!(temp instanceof Grouping) && !this.match('\\n') && this.peek().type != 'EOF') {
                    this.consume(';')
                }

            } else {
                break;
            }

        }
        
        //Set the Parser's current scope at the same level as the enclosure.
        this.scope = this.scope.superScope;
        
        return statements;

    },

    methodCall: function (char) {
        var args = [];

        this.consume('(');

        args.push(this.expression());

        while (this.match(char)) {
            args.push(this.expression());
        }

        this.consume(')');

        return args;

    },

    printStatement: function () {
        var value = this.methodCall(',');

        return new PrintStatement(value);
    },

    drawStatement: function () {
        var element;

        if (this.peek().type == 'SHAPE') {
            element = this.shape(this.advance());

        } else if (this.peek().type == 'ID') {
            element = new Variable(this.advance(), null, this.scope);

        } else {
            throw new ParsingError(this.peek().line, "Expected a valid shape reference or declaration.");
        }

        return new DrawStatement(element);
    },

    ifStatement: function (baseline) {
        this.consume('(');

        var expr = this.expression();
        if (!(expr instanceof Comparison || expr instanceof Literal)) {
            throw new ParsingError(this.peek().line, "Expected a boolean expression.");
        }

        this.consume(')')
        this.consume('\\n');
        
        //If statements do not need special access to their inner scope, so null is passed as the second argument
        var statements = this.block(baseline, null);

        return new If(expr, statements);
    },

    forStatement: function (baseline) {

        var args = this.methodCall(';');

        if (!(args[0] instanceof Assignment || args[0] instanceof Variable)) {
            throw new ParsingError(this.peek().line, "Expected a declaration or assignment.");
        }

        if (!(args[1] instanceof Comparison)) {
            throw new ParsingError(this.peek().line, "Expected a comparison.");
        }

        if (!(args[2] instanceof UnaryExpr || args[2] instanceof Assignment)) {
            throw new ParsingError(this.peek().line, "Expected an update.");
        }

        this.consume('\\n');
        
        //For statements do not need special access to their inner scope, so null is passed as the second argument
        var statements = this.block(baseline, null);

        return new For(args, statements);
    },

    timestep: function (left, baseline) {
        var operator = this.consume('<-', '->');
        
        var upper;
        var lower;

        if (left instanceof Literal) {
            this.consume('T');
            switch (operator.text) {
                case '<-':
                    upper = left;
                    if (this.peek().text == operator.text) {
                        this.advance();
                        lower = this.expression();
                    } else {
                        lower = undefined;
                    }
                    break;
                case '->':
                    lower = left;
                    if (this.peek().text == operator.text) {
                        this.advance();
                        upper = this.expression();
                    } else {
                        upper = undefined;
                    }
                    break;
            }
        } else if (left.type == 'T') {
            var expr = this.expression();
            switch (operator.text) {
                case '<-':
                    lower = expr;
                    upper = undefined;
                    break;
                case '->':
                    upper = expr;
                    lower = undefined;
                    break;
            }

        }
        //TimeSteps need special access to their inner scope in order to control the value of 't'. Thus, a scope is passed as the second argument.
        var innerScope = new Scope();
        
        this.consume('\\n');
        var statements = this.block(baseline, innerScope);

        return new TimeStep(lower, upper, statements, innerScope);


    },

    rectStatement: function () {

        var args = this.methodCall(',');

        if (args.length != 4) throw new ParsingError(this.previous().line, 'Excessive or missing arguments.');

        return new Rectangle(args);

    },

    circleStatement: function () {

        var args = this.methodCall(',');

        if (args.length != 3) throw new ParsingError(this.previous().line, 'Excessive or missing arguments.');

        return new Circle(args);

    },

    ellipseStatement: function () {

        var args = this.methodCall(',');

        if (args.length != 4) throw new ParsingError(this.previous().line, 'Excessive or missing arguments.');

        return new Ellipse(args);

    },

    textStatement: function () {

        var args = this.methodCall(',');

        if (args.length < 2 || args.length > 3) throw new ParsingError(this.previous().line, 'Excessive or missing arguments.');

        return new Text(args);
    },

    polyStatement: function (polyType) {
        var points = [];

        for (var i = 0; i <= 2; ++i) {
            points.push(this.point());
        }

        while (this.peek().type != "INTEGER") {
            points.push(this.point());
        }

        switch (polyType) {
            case 'polyline':
                return new Polyline(points);
            case 'polygon':
                return new Polygon(points);
        }
    },

    lineStatement: function () {
        var point1 = this.point();
        var point2 = this.point();

        return new Line(point1, point2);
    }

}
