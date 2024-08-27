type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;

export function omitProperties<T, K extends keyof T>(obj: T, ...keys: K[]): Omit<T, K> {
    let result = {} as any;
    for (let key in obj) {
        if (!keys.includes(key as any)) {
            result[key] = obj[key];
        }
    }
    return result as Omit<T, K>;
}
