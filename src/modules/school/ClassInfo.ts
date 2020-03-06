import Parameters from './MyParameters';
import MyLogger from '../MyLogger';
const Logger = MyLogger.getLogger();

/**
 * 教室情報 Excel から読み取る項目の設定と読み取ったデータの格納用クラス
 * @property {object} definition - Excel の読み取り用設定
 * @property {Array} data - 読み取った教室別データ
 * @property {object} FCSV - FC/SV の階層構造を表すオブジェクト
 */
export default class ClassInfo {
    public definition: { [s: string]: any }[];
    public data: { [s: string]: any }[];
    public FCSV: { [s: string]: any };
    constructor() {
        this.definition = [
            {
                name: 'code',
                header: '',
                columnNumber: null,
                rowNumber: null,
            },
            {
                name: 'name',
                header: '',
                columnNumber: null,
                rowNumber: null,
            },
            {
                name: 'from',
                header: '',
                columnNumber: null,
                rowNumber: null,
            },
            {
                name: 'to',
                header: '',
                columnNumber: null,
                rowNumber: null,
            },
            {
                name: 'sv',
                header: '',
                columnNumber: null,
                rowNumber: null,
                type: 'folder',
            },
            {
                name: 'fc',
                header: '',
                columnNumber: null,
                rowNumber: null,
                type: 'folder',
            },
            {
                name: 'fileName',
                header: '',
                columnNumber: null,
                rowNumber: null,
            },
            {
                name: 'prefecture',
                header: '',
                columnNumber: null,
                rowNumber: null,
            },
        ];
        this.data = [];
        this.FCSV = {};
    }

    /**
     * definition を name フィールドで検索して取得する
     * @param {string} name - definition の name フィールド
     * @returns {Object|null} - definition の該当の要素
     */
    public getDefinitionByName(name: string): { [s: string]: any } | null {
        for (const field of this.definition) {
            if (field.name === name) {
                return field;
            }
        }
        return null;
    }

    /**
     * definition を name フィールドで検索して header に value を設定する
     * @param {string} name - definition の name フィールド
     * @param {string} value - definition の header フィールドに設定する文字列
     */
    public setTitleOfHeader(name: string, value: string) {
        for (const field of this.definition) {
            if (String(field.name) === String(name)) {
                field.header = value;
            }
        }
    }

    /**
     * 教室情報を教室コードで検索して得る
     * @param {string} code - 教室コード文字列
     * @returns {Object} - 教室情報オブジェクト
     */
    public getDataByCode(code: string): { [s: string]: any } | undefined {
        for (const datum of this.data) {
            if (String(datum.code) === String(code)) {
                return datum;
            }
        }
        return;
    }

    /**
     * 教室情報をファイル名で検索して得る
     * @param {string} filename - 教室コードを含むファイル名文字列
     * @returns {Object} - 教室情報オブジェクト
     */
    public getDataByCodeInFilename(filename: string): { [s: string]: any } | undefined {
        for (const datum of this.data) {
            if (new RegExp('_' + datum.code + '_', 'i').test(filename)) {
                return datum;
            }
        }
        return;
    }

    /**
     * SV/FC の階層構造モデルを作成する
     */
    public makeFCSVData() {
        for (const datum of this.data) {
            if (!this.FCSV[String(datum.fc)]) {
                this.FCSV[datum.fc] = {};
                this.FCSV[datum.fc].count = 0;
            }
            if (!this.FCSV[datum.fc][datum.sv]) {
                this.FCSV[datum.fc][datum.sv] = true;
                this.FCSV[datum.fc].count++;
            }
        }
    }
    /**
     * FCに対してSVがいくつあるか数えた結果を得る
     * @param {string} fc - FC名称文字列
     * @returns {number} - FCに対するSVの数
     */
    public getFCSVCount(fc: string): number {
        if (!fc || !this.FCSV[fc]) {
            return 0;
        }
        return this.FCSV[fc].count;
    }

    /**
     * 実行パラメータからエクセルのヘッダ情報などを格納する
     * @param {Object} PARAMETERS - 実行パラメータオブジェクト
     * @returns {boolean} - 正常に終了した場合 true
     */
    public setDefinitionFromParams(PARAMETERS: Parameters): boolean {
        if (!PARAMETERS) {
            Logger.info('ERROR: no parameters');
            return false;
        }
        // Excel シートの項目名を設定
        this.setTitleOfHeader('code', PARAMETERS.EXCEL_CELLHEADER_CODE);
        this.setTitleOfHeader('name', PARAMETERS.EXCEL_CELLHEADER_NAME);
        this.setTitleOfHeader('from', PARAMETERS.EXCEL_CELLHEADER_FROM_DATE);
        this.setTitleOfHeader('to', PARAMETERS.EXCEL_CELLHEADER_TO_DATE);
        this.setTitleOfHeader('sv', PARAMETERS.EXCEL_CELLHEADER_FOLDER_1);
        this.setTitleOfHeader('fc', PARAMETERS.EXCEL_CELLHEADER_FOLDER_2);
        this.setTitleOfHeader('fileName', PARAMETERS.EXCEL_CELLHEADER_RERORT_TITLE);
        this.setTitleOfHeader('prefecture', PARAMETERS.EXCEL_CELLHEADER_PREFECTURE);

        return true;
    }

    /**
     * エクセルのシートを読んで definition の中の項目を探して位置を記録していく
     * @param {Object} sheet - 教室情報エクセルシートオブジェクト (xlsx-populate.Worksheet)
     * @returns {boolean} - 正常に終了した場合 true
     */
    public setHeadersAddressFromSheet(sheet: any): boolean {
        const rangeValues = sheet.range('A1', 'AZ10').value();
        const rangeFind = (rangeValues: any, searchValue: any) => {
            for (let row = 0; row < rangeValues.length; row++) {
                for (let col = 0; col < rangeValues[row].length; col++) {
                    if (rangeValues[row][col] === searchValue) {
                        return { row: row + 1, col: col + 1 };
                    }
                }
            }
            return { row: 0, col: 0 };
        };
        for (const field of this.definition) {
            const result = rangeFind(rangeValues, field.header);
            field.columnNumber = result.col;
            field.rowNumber = result.row;
        }
        for (const field of this.definition) {
            if (field.columnNumber === null || field.columnNumber === 0) {
                Logger.info(
                    `ERROR: ClassInfo.setHeadersAddressFromSheet / The spacified field "${field.header}" was not found in sheet.`
                );
                return false;
            }
        }
        return true;
    }

    /**
     * エクセルのシートを読んで data に設定を蓄積していく
     * @param {Object} sheet - 教室情報エクセルシートオブジェクト (xlsx-populate.Worksheet)
     * @returns {boolean} - 正常に終了し、dataに蓄積された件数が 1 以上の場合 true
     */
    public makeSettingsFromSheet(sheet: any) {
        let blankRowCount = 0;
        let rowCount = 1;
        const blankRowLimit = 5;
        const definition_code = this.getDefinitionByName('code');
        if (!definition_code) {
            return false;
        }
        const startRowNumber = definition_code.rowNumber;

        while (blankRowCount < blankRowLimit) {
            const locationName = sheet.cell(startRowNumber + rowCount, definition_code.columnNumber).value();
            if (typeof locationName !== 'undefined') {
                //const tmpData: ItmpData = {};
                const tmpData: { [s: string]: any } = {};
                for (const field of this.definition) {
                    const cellValue = String(sheet.cell(startRowNumber + rowCount, field.columnNumber).value());
                    tmpData[field.name] = cellValue || '';
                    if (tmpData[field.name] === 'undefined') {
                        Logger.info(
                            `ERROR: ClassInfo.makeSettingsFromSheet / A data for location code "${locationName}" and field "${field.header}" was not valid.`
                        );
                        return false;
                    }
                    if (field.type === 'folder') {
                        tmpData[field.name] = tmpData[field.name].replace(/\//, '');
                    }
                }
                this.data.push(tmpData);
                blankRowCount = 0;
            } else {
                blankRowCount++;
            }
            rowCount++;
        }
        Logger.info(`ClassInfo.makeSettingsFromSheet: rowCount: ${rowCount} / blankRowCount: ${blankRowCount}`);

        // FC-SV List を作成しておく（FCの名称かぶり対策）
        this.makeFCSVData();
        return this.data && this.data.length;
    }
}
