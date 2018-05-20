export class AsyncSemaphore {
    private promises = Array<() => void>()

    constructor(private permits: number) { }

    signal() {
        if (this.promises.length > 0) this.promises.pop()()
        this.permits += 1
    }

    async wait() {
        this.permits -= 1
        if (this.permits < 0)
            await new Promise(r => this.promises.unshift(r))
    }
}