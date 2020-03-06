import MyUtil from '../MyUtil';
import MyDate from '../MyDate';
import MyLogger from '../MyLogger';
import CodeVariants from './CodeVariants';
const Logger = MyLogger.getLogger();

/**
 *  Google Analytics のデータクラス
 */
export default class GAData {
    private definition: { [s: string]: any } = {};
    public data: { [s: string]: any } = {};
    public filled: boolean = false;

    /**
     * Creates an instance of GAData.
     * @param {*} sheet - シートオブジェクト (xlsx-populate)
     * @param {string} fieldName_code - 教室コードのフィールド名文字列
     * @param {string} fieldName_date - 日付のフィールド名文字列
     * @param {string} fieldName_sessions - セッション数フィールド名文字列
     * @param {CodeVariants} codeVariants - コード変換表
     * @memberof GAData
     */
    constructor(
        sheet: any,
        fieldName_code: string,
        fieldName_date: string,
        fieldName_sessions: string,
        codeVariants: CodeVariants
    ) {
        if (!sheet || !fieldName_code || !fieldName_date || !fieldName_sessions || !codeVariants) {
            return;
        }

        this.definition = {
            code: {
                name: fieldName_code,
                columnNumber: 0,
                rowNumber: 0,
            },
            date: {
                name: fieldName_date,
                columnNumber: 0,
                rowNumber: 0,
            },
            sessions: {
                name: fieldName_sessions,
                columnNumber: 0,
                rowNumber: 0,
            },
        };

        // definition 作成
        for (const type of ['code', 'date', 'sessions']) {
            const def = this.definition[type];
            const cells = sheet.find(def.name);
            for (const cell of cells) {
                Logger.trace(`GAData definition: ${JSON.stringify(def)}`);
                if (String(cell.value()) === def.name) {
                    def.columnNumber = parseInt(cell.columnNumber());
                    def.rowNumber = parseInt(cell.rowNumber());
                    break;
                }
            }
        }

        // データ作成
        let blankRowCount = 0;
        let rowCount = 1;
        const blankRowLimit = 5;
        const startRow = this.definition['code'].rowNumber;

        while (blankRowCount < blankRowLimit) {
            const code = String(sheet.cell(startRow + rowCount, this.definition['code'].columnNumber).value());
            const date = String(sheet.cell(startRow + rowCount, this.definition['date'].columnNumber).value());
            const sessions = Number(sheet.cell(startRow + rowCount, this.definition['sessions'].columnNumber).value());

            if (code !== 'undefined' && date !== 'undefined' && !isNaN(sessions)) {
                const ancestorCode = codeVariants.getAncestorCode(code.replace(/\D/g, ''));
                if (typeof this.data[ancestorCode] === 'undefined') {
                    this.data[ancestorCode] = {};
                }
                const tmpDate = MyUtil.parseDateString(date, 'YYYYMMDD');
                if (tmpDate.toString() === 'Invalid Date') {
                    Logger.trace(`GAData / A data in row ${startRow + rowCount} was invalid or blank. Line skipped.`);
                    continue;
                }
                const tmpDateString = tmpDate.getFormattedString('YYYY-MM-DD');
                if (typeof this.data[ancestorCode][tmpDateString] === 'undefined') {
                    this.data[ancestorCode][tmpDateString] = 0;
                }
                this.data[ancestorCode][tmpDateString] += sessions;
                this.filled = true;
            } else {
                blankRowCount++;
            }
            rowCount++;
        }
    }

    /**
     * 月ごとの集計
     * @param {MyDate} fromDate - 集計範囲開始日
     * @param {MyDate} toDate - 集計範囲終了日
     * @param {string} locationCode - 集計対象教室コード
     * @returns {{}} - 集計結果オブジェクト
     * @memberof GAData
     */
    public makeMonthTotal(fromDate: MyDate, toDate: MyDate, locationCode: string): {} {
        const monthTotal: { [s: string]: number } = {};
        const loopDate = new MyDate(fromDate);
        while (loopDate <= toDate) {
            if (typeof this.data[locationCode] !== 'undefined') {
                if (!monthTotal[loopDate.getFormattedString('YYYY年M月')]) {
                    monthTotal[loopDate.getFormattedString('YYYY年M月')] = 0;
                }
                if (typeof this.data[locationCode][loopDate.getDateString('-')] !== 'undefined') {
                    monthTotal[loopDate.getFormattedString('YYYY年M月')] += this.data[locationCode][
                        loopDate.getDateString('-')
                    ];
                }
            }
            loopDate.addDay();
        }
        return monthTotal;
    }
}
