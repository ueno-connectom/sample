import MyLogger from '../MyLogger';
const Logger = MyLogger.getLogger();

/**
 *  Suggestions のデータクラス IF
 */
interface ISuggestions {
    /**
     * 示唆コメント配列
     * @type {ISuggestion[]}
     * @memberof ISuggestions
     */
    suggestions: ISuggestion[];
    filled: boolean;
    getSuggestionText(pattern: number): string;
}

interface ISuggestion {
    /**
     * 示唆コメントパターンID
     * 問い合わせ: 8, ページ閲覧数: 4, 表示回数: 2, クリック率: 1 の組み合わせ
     * @type {number}
     * @memberof ISuggestion
     */
    patternID: number;
    /**
     * 示唆コメント文字列
     * @type {string}
     * @memberof ISuggestion
     */
    suggestionText: string;
}

/**
 *  示唆コメント情報 Suggestions
 */
class Suggestions implements ISuggestions {
    private definition: { [s: string]: any } = {};
    public suggestions: ISuggestion[] = [];
    public filled: boolean = false;

    /**
     * Creates an instance of Suggestions.
     * @param {*} sheet - シートオブジェクト (xlsx-populate)
     * @param {string} fieldName_pattern - パターンのフィールド名文字列
     * @param {string} fieldName_text - 示唆コメントのフィールド名文字列
     * @memberof Suggestions
     */
    constructor(sheet: any, fieldName_pattern: string, fieldName_text: string) {
        if (!sheet || !fieldName_pattern || !fieldName_text) {
            return;
        }

        this.definition = {
            pattern: {
                name: fieldName_pattern,
                columnNumber: 0,
                rowNumber: 0,
            },
            text: {
                name: fieldName_text,
                columnNumber: 0,
                rowNumber: 0,
            },
        };

        // definition 作成
        for (const type of ['pattern', 'text']) {
            const def = this.definition[type];
            const cells = sheet.find(def.name);
            for (const cell of cells) {
                if (String(cell.value()) === def.name) {
                    def.columnNumber = parseInt(cell.columnNumber());
                    def.rowNumber = parseInt(cell.rowNumber());
                    break;
                }
            }
            Logger.trace(`Suggestions definition: ${JSON.stringify(def)}`);
        }

        // データ作成
        let blankRowCount = 0;
        let rowCount = 1;
        const blankRowLimit = 5;
        const startRow = this.definition['pattern'].rowNumber;

        while (blankRowCount < blankRowLimit) {
            const pattern = Number(sheet.cell(startRow + rowCount, this.definition['pattern'].columnNumber).value());
            const text = String(sheet.cell(startRow + rowCount, this.definition['text'].columnNumber).value());

            if (!isNaN(pattern) && text !== 'undefined') {
                this.suggestions.push(new Suggestion(pattern, text));
                this.filled = true;
            } else {
                blankRowCount++;
            }
            rowCount++;
        }
    }
    /**
     * 示唆コメント取得
     * @param {number} patternID - パターンID （0-15）
     * @returns {string} - 示唆コメント文字列
     * @memberof Suggestions -
     */
    public getSuggestionText(patternID: number): string {
        return this.suggestions.reduce((acc: string, suggestion) => {
            if (suggestion.patternID === patternID) {
                acc = suggestion.suggestionText;
            }
            return acc;
        }, '');
    }
}
/**
 *  Suggests のデータクラス
 */
class Suggestion implements ISuggestion {
    patternID: number;
    suggestionText: string;
    /**
     * Creates an instance of Suggestion.
     * @param {number} patternID - パターン数値
     * @param {string} text - 示唆コメント文字列
     * @memberof Suggestion
     */
    constructor(patternID: number, text: string) {
        this.patternID = patternID;
        this.suggestionText = text;
    }
}

export default Suggestions;
