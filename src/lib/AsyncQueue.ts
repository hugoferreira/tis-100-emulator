import { AsyncSemaphore } from './AsyncSemaphore'

export class AsyncQueue<T> {
    private queue = Array<T>()
    private waitingEnqueue: AsyncSemaphore
    private waitingDequeue: AsyncSemaphore
    public last: T

    constructor(readonly maxSize: number) {
        this.waitingEnqueue = new AsyncSemaphore(0)
        this.waitingDequeue = new AsyncSemaphore(maxSize)
    }

    async enqueue(x: T) {
        this.last = x
        await this.waitingDequeue.wait()
        this.queue.unshift(x)
        this.waitingEnqueue.signal()
    }

    async dequeue() {
        this.waitingDequeue.signal()
        await this.waitingEnqueue.wait()
        const x = this.queue.pop()!
        return x
    }
}