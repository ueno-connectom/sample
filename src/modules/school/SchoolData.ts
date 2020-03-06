import MyUtil from '../MyUtil';
import MyLogger from '../MyLogger';
const Logger = MyLogger.getLogger();

/**
 *  School提供のデータ（外部データ）クラス
 */
export default class SchoolData {
    public filled: boolean = false;
    public definition: { [s: string]: any } = {};
    public fields: { [s: string]: any } = {};
    public storedDataCount: number = 0;
    [s: string]: any;
    /**
     * コンストラクタ
     * @param {Object} sheet - School提供のデータのエクセルシートオブジェクト (xlsx-populate.worksheet)
     * @param {string} fieldsString - フィールド名をカンマ接続した文字列
     */
    constructor(sheet: any, fieldsString: string) {
        this.filled = false;
        if (!sheet || !fieldsString) {
            return;
        }

        this.fields = {
            location: fieldsString.split(',')[0],
            data: [],
        };
        this.definition = {};
        this.storedDataCount = 0;

        // definition 作成
        for (const name of fieldsString.split(',')) {
            this.fields.data.push(name);
            const cells = sheet.find(name);
            for (const cell of cells) {
                if (String(cell.value()) === name) {
                    if (typeof this.definition[name] === 'undefined') {
                        this.definition[name] = [];
                    }
                    const dateValue = sheet.cell(cell.rowNumber() - 1, cell.columnNumber()).value();
                    const dateString = dateValue
                        ? MyUtil.getDateFromExcelDatetime(dateValue).getFormattedString('YYYY年M月')
                        : '';
                    this.definition[name].push({
                        name: dateString,
                        columnNumber: cell.columnNumber(),
                        rowNumber: cell.rowNumber(),
                    });
                }
            }
        }

        // データ作成
        let blankRowCount = 0;
        let rowCount = 1;
        const blankRowLimit = 5;
        const startRow = this.definition[this.fields.location][0].rowNumber;

        while (blankRowCount < blankRowLimit) {
            const locationCode = String(
                sheet.cell(startRow + rowCount, this.definition[this.fields.location][0].columnNumber).value()
            ).replace(/^S/, '');
            if (locationCode !== 'undefined') {
                this[locationCode] = {};
                this.storedDataCount++;
                for (const field of this.fields.data) {
                    if (!this[locationCode][field]) {
                        this[locationCode][field] = {};
                    }
                    for (const definition of this.definition[field]) {
                        this[locationCode][field][definition.name] = sheet
                            .cell(startRow + rowCount, definition.columnNumber)
                            .value();
                        if (typeof this[locationCode][field][definition.name] === 'undefined') {
                            Logger.trace(
                                `SchoolData / A data on ${locationCode}[${field}[${definition.name}]] was invalid or blank. set 0 instead.`
                            );
                            this[locationCode][field][definition.name] = 0;
                        }
                    }
                }
            } else {
                blankRowCount++;
            }
            rowCount++;
        }
        this.filled = this.storedDataCount > 0;
    }
}
