import { AsyncSemaphore } from './AsyncSemaphore'

export class AsyncQueue<T> {
    private queue = Array<T>()
    private fillCount: AsyncSemaphore
    private emptyCount: AsyncSemaphore
    public last: T

    get isEmpty() { return this.queue.length === 0}

    constructor(readonly maxSize: number) {
        this.fillCount = new AsyncSemaphore(0)
        this.emptyCount = new AsyncSemaphore(maxSize)
    }

    async enqueue(x: T) {
        this.last = x
        await this.emptyCount.wait()
        this.queue.unshift(x)
        this.fillCount.signal()
    }

    async dequeue() {
        this.emptyCount.signal()
        await this.fillCount.wait()
        const result = this.queue.pop()!
        return result
    }
}