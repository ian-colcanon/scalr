/* global Console */
export function Error(line, message) {
    this.line = line;
    this.message = message;
}
Error.prototype.constructor = Error;
Error.prototype.printMessage = function () {
    Console.print(this.message + " (line " + this.line + ")");
}

export function ParsingError(line, message) {
    Error.call(this, line, message);
}

ParsingError.prototype = Object.create(Error.prototype);

export function LexingError(line, message) {
    Error.call(this, line, message);
}

LexingError.prototype = Object.create(Error.prototype);

export function RuntimeError(line, message) {
    Error.call(this, line, message);
}

RuntimeError.prototype = Object.create(Error.prototype);