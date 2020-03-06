/**
 * 組み込み Date が不便なのでメソッド追加したやつ
 */
export default class MyDate {
    public date: Date = new Date();

    /**
     * MyDate 組み込み Date が不便なのでメソッド追加したやつ
     * @param {any} param - Date(param) のパラメータ
     */
    constructor(param: any = Date.now()) {
        switch (typeof param) {
            case 'number':
                this.date = new Date(param);
                break;
            case 'string':
                if (/\D/.test(param)) {
                    this.date = new Date(param);
                } else {
                    this.date = new Date(Number(param));
                }
                break;
            case 'object':
                if (Object.prototype.isPrototypeOf.call(Date.prototype, param)) {
                    this.date = new Date(param);
                } else if (Object.prototype.isPrototypeOf.call(MyDate.prototype, param)) {
                    this.date = new Date(param.getTime());
                } else {
                    this.date = new Date(Date.now());
                }
                break;
            default: {
                this.date = new Date(param);
            }
        }
    }

    public getDate() {
        return this.date.getDate();
    }
    public getDay() {
        return this.date.getDay();
    }
    public getFullYear() {
        return this.date.getFullYear();
    }
    public getHours() {
        return this.date.getHours();
    }
    public getMilliseconds() {
        return this.date.getMilliseconds();
    }
    public getMinutes() {
        return this.date.getMinutes();
    }
    public getMonth() {
        return this.date.getMonth();
    }
    public getSeconds() {
        return this.date.getSeconds();
    }
    public getTime() {
        return this.date.getTime();
    }
    public getTimezoneOffset() {
        return this.date.getTimezoneOffset();
    }
    public getUTCDate() {
        return this.date.getUTCDate();
    }
    public getUTCDay() {
        return this.date.getUTCDay();
    }
    public getUTCFullYear() {
        return this.date.getUTCFullYear();
    }
    public getUTCHours() {
        return this.date.getUTCHours();
    }
    public getUTCMilliseconds() {
        return this.date.getUTCMilliseconds();
    }
    public getUTCMinutes() {
        return this.date.getUTCMinutes();
    }
    public getUTCMonth() {
        return this.date.getUTCMonth();
    }
    public getUTCSeconds() {
        return this.date.getUTCSeconds();
    }
    public setDate(param?: any) {
        return this.date.setDate(param);
    }
    public setFullYear(param?: any) {
        return this.date.setFullYear(param);
    }
    public setHours(param?: any) {
        return this.date.setHours(param);
    }
    public setMilliseconds(param?: any) {
        return this.date.setMilliseconds(param);
    }
    public setMinutes(param?: any) {
        return this.date.setMinutes(param);
    }
    public setMonth(param?: any) {
        return this.date.setMonth(param);
    }
    public setSeconds(param?: any) {
        return this.date.setSeconds(param);
    }
    public setTime(param?: any) {
        return this.date.setTime(param);
    }
    public setUTCDate(param?: any) {
        return this.date.setUTCDate(param);
    }
    public setUTCFullYear(param?: any) {
        return this.date.setUTCFullYear(param);
    }
    public setUTCHours(param?: any) {
        return this.date.setUTCHours(param);
    }
    public setUTCMilliseconds(param?: any) {
        return this.date.setUTCMilliseconds(param);
    }
    public setUTCMinutes(param?: any) {
        return this.date.setUTCMinutes(param);
    }
    public setUTCMonth(param?: any) {
        return this.date.setUTCMonth(param);
    }
    public setUTCSeconds(param?: any) {
        return this.date.setUTCSeconds(param);
    }
    public toDateString() {
        return this.date.toDateString();
    }
    public toISOString() {
        return this.date.toISOString();
    }
    public toJSON() {
        return this.date.toJSON();
    }
    public toLocaleDateString() {
        return this.date.toLocaleDateString();
    }
    public toLocaleString() {
        return this.date.toLocaleString();
    }
    public toLocaleTimeString() {
        return this.date.toLocaleTimeString();
    }
    public toString() {
        return this.date.toString();
    }
    public getTitoTimeStringme() {
        return this.date.toTimeString();
    }
    public toUTCString() {
        return this.date.toUTCString();
    }
    public valueOf() {
        return this.date.valueOf();
    }

    /**
     * YYYY-MM-DD 形式の文字列を得る
     * @param {string} delim - 区切り文字
     * @returns {string} - 日付文字列
     */
    public getDateString(delim: string = '-'): string {
        return this.getFormattedString(`YYYY${delim}MM${delim}DD`);
    }

    /**
     * 任意の形式にフォーマットされた日時文字列を得る
     * @param {string} format - 以下の文字が置換される YYYY / YY / MM / M / DD / D / hh / h / mm / m / ss / s / ms
     * @param {boolean} isUTC - UTCで計算するかどうかのスイッチ
     * @returns {string} - 置き換え後の文字列
     */
    public getFormattedString(format: string, isUTC: boolean = false): string {
        if (typeof format !== 'string') {
            format = 'YYYY-MM-DD hh:mm:ss';
        }

        let resultString = format;
        if (isUTC) {
            resultString = resultString.replace(/YYYY/g, String(this.date.getUTCFullYear()));
            resultString = resultString.replace(/YY/g, String(this.date.getUTCFullYear()).substr(2, 2));
            resultString = resultString.replace(/MM/g, String(this.date.getUTCMonth() + 1).padStart(2, '0'));
            resultString = resultString.replace(/M/g, String(this.date.getUTCMonth() + 1));
            resultString = resultString.replace(/DD/g, String(this.date.getUTCDate()).padStart(2, '0'));
            resultString = resultString.replace(/D/g, String(this.date.getUTCDate()));
            resultString = resultString.replace(/hh/g, String(this.date.getUTCHours()).padStart(2, '0'));
            resultString = resultString.replace(/h/g, String(this.date.getUTCHours()));
            resultString = resultString.replace(/mm/g, String(this.date.getUTCMinutes()).padStart(2, '0'));
            resultString = resultString.replace(/ms/g, String(this.date.getUTCMilliseconds()).padStart(3, '0'));
            resultString = resultString.replace(/m/g, String(this.date.getUTCMinutes()));
            resultString = resultString.replace(/ss/g, String(this.date.getUTCSeconds()).padStart(2, '0'));
            resultString = resultString.replace(/s/g, String(this.date.getUTCSeconds()));
        } else {
            resultString = resultString.replace(/YYYY/g, String(this.date.getFullYear()));
            resultString = resultString.replace(/YY/g, String(this.date.getFullYear()).substr(2, 2));
            resultString = resultString.replace(/MM/g, String(this.date.getMonth() + 1).padStart(2, '0'));
            resultString = resultString.replace(/M/g, String(this.date.getMonth() + 1));
            resultString = resultString.replace(/DD/g, String(this.date.getDate()).padStart(2, '0'));
            resultString = resultString.replace(/D/g, String(this.date.getDate()));
            resultString = resultString.replace(/hh/g, String(this.date.getHours()).padStart(2, '0'));
            resultString = resultString.replace(/h/g, String(this.date.getHours()));
            resultString = resultString.replace(/mm/g, String(this.date.getMinutes()).padStart(2, '0'));
            resultString = resultString.replace(/ms/g, String(this.date.getMilliseconds()).padStart(3, '0'));
            resultString = resultString.replace(/m/g, String(this.date.getMinutes()));
            resultString = resultString.replace(/ss/g, String(this.date.getSeconds()).padStart(2, '0'));
            resultString = resultString.replace(/s/g, String(this.date.getSeconds()));
        }
        return resultString;
    }

    /**
     * days で与えられた日数を追加した MyDate オブジェクトを得る
     * @param {number} days -
     * @returns {MyDate} - 日数を追加した MyDate オブジェクト
     */
    public addDay(days: number = 1): any {
        this.date.setTime(this.date.getTime() + 86400000 * days);
        return this;
    }

    /**
     * 日本語の曜日一文字を得る
     * @returns {string} - 日本語の曜日一文字
     */
    public getWeekdayString(): string {
        return ['日', '月', '火', '水', '木', '金', '土'][this.date.getDay()];
    }
}
