import MyLogger from '../MyLogger';
const Logger = MyLogger.getLogger();

/**
 *  コード変換リストクラス
 */
export default class CodeVariants {
    private codes: [string[]];
    private definition: {
        code: {
            name: string;
            columnNumber: number;
            rowNumber: number;
        };
        parent: {
            name: string;
            columnNumber: number;
            rowNumber: number;
        };
    };
    public filled: boolean;

    /**
     * コンストラクタ
     */
    constructor() {
        this.codes = [[]];
        this.definition = {
            code: {
                name: 'code',
                columnNumber: 0,
                rowNumber: 0,
            },
            parent: {
                name: 'parent',
                columnNumber: 0,
                rowNumber: 0,
            },
        };
        this.filled = false;
    }

    /**
     * Excel シートからデータ作成
     * @param {Object} sheet - コード変換リストのエクセルシートオブジェクト (xlsx-populate)
     * @returns {boolean} - 成功/失敗
     */
    public makeFromSheet(sheet: any): boolean {
        if (!sheet) {
            return false;
        }

        // definition 作成
        // code
        for (const cell of sheet.find(this.definition.code.name)) {
            if (String(cell.value()) === this.definition.code.name) {
                this.definition.code.columnNumber = parseInt(cell.columnNumber());
                this.definition.code.rowNumber = parseInt(cell.rowNumber());
                break;
            }
        }
        // parent
        for (const cell of sheet.find(this.definition.parent.name)) {
            if (String(cell.value()) === this.definition.parent.name) {
                this.definition.parent.columnNumber = parseInt(cell.columnNumber());
                this.definition.parent.rowNumber = parseInt(cell.rowNumber());
                break;
            }
        }
        if (this.definition.code.rowNumber === 0 || this.definition.parent.rowNumber === 0) {
            return false;
        }

        // データ作成
        let blankRowCount = 0;
        let rowCount = 1;
        const blankRowLimit = 5;
        const startRow = this.definition['code'].rowNumber;

        while (blankRowCount < blankRowLimit) {
            const code = String(sheet.cell(startRow + rowCount, this.definition['code'].columnNumber).value());
            const parent = String(sheet.cell(startRow + rowCount, this.definition['parent'].columnNumber).value());
            if (code !== 'undefined' && parent !== 'undefined') {
                this.codes.push([code, parent]);
                this.filled = true;
            } else {
                blankRowCount++;
            }
            rowCount++;
        }
        return true;
    }

    /**
     * コード変換表から祖先を調べる
     * @param {string} code - 調べるコード
     * @param {number} depth - 再帰時の深さ(通常省略)
     * @returns {string} - 祖先のコード
     */
    public getAncestorCode(code: string = '', depth: number = 0): string {
        if (depth > 10) {
            return String(code);
        }
        let parentCode = '';
        for (const i in this.codes) {
            if (
                this.codes[i] instanceof Array &&
                this.codes[i].length > 1 &&
                String(this.codes[i][0]) === String(code)
            ) {
                parentCode = String(this.codes[i][1]);
                break;
            }
        }
        if (String(code) === parentCode || parentCode === '') {
            return String(code);
        }
        const subResult = this.getAncestorCode(parentCode, depth + 1);
        return subResult === parentCode ? parentCode : subResult;
    }

    /**
     * コード変換表から子孫一覧を調べる
     * @param {string} code - 調べるコード
     * @param {number} depth - 再帰時の深さ(通常省略)
     * @returns {string[]} - 子孫のコード配列
     */
    public getDescendantCodes(code: string = '', depth: number = 0): string[] {
        if (depth > 10) {
            return [];
        }
        let childCodes = [];
        for (const i in this.codes) {
            if (
                this.codes[i] instanceof Array &&
                this.codes[i].length > 1 &&
                String(this.codes[i][1]) === String(code)
            ) {
                childCodes.push(String(this.codes[i][0]));
            }
        }
        if (childCodes.length === 0) {
            return [];
        }
        for (const i in childCodes) {
            const subResult = this.getDescendantCodes(childCodes[i], depth + 1);
            if (subResult && subResult.length > 0) {
                childCodes = childCodes.concat(subResult);
            }
        }
        childCodes.sort((a, b) => {
            return Number(a) - Number(b);
        }); // 比較は数値扱い
        childCodes = childCodes.filter((x, i, self) => {
            return self.indexOf(x) === i;
        });
        return childCodes;
    }
}
