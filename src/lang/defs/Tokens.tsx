import {TokenType} from './TokenTypes';


export class Token {
    type: TokenType;
    line: number;
    toString () {
        return "{ type: " + TokenType[this.type] + ", line: " + this.line + "}";
    }

    constructor(type: TokenType, line: number){
        this.type = type;
        this.line = line;
    }
}

export class Literal extends Token {
    value: any;

    constructor(type: TokenType, line: number, value: any){
        super(type, line);
        this.value = value;
    }
    
    toString (): string{
        const superString = super.toString();
        return superString.substr(0, superString.length - 1) + ', value: ' + this.value + '}';
    }
}

export class Indent extends Token {
    degree: number;
    constructor(line: number, degree: number){
        super(TokenType.INDENT, line);
        this.degree = degree;
    }

    toString(): string {
        const superString = super.toString();
        return superString.substr(0, superString.length - 1) + ', degree: ' + this.degree + '}';
    }
}