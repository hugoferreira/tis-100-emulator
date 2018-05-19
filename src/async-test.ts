import { AsyncQueue } from './AsyncQueue'

async function produce<T>(q: AsyncQueue<T>, x: T) {
    q.enqueue(x)
}

async function consume<T>(q: AsyncQueue<T>) {
    return q.dequeue()
}

(async () => {
    const q = new AsyncQueue<number>(0)
    consume(q).then(console.log)
    consume(q).then(console.log)
    produce(q, 1)
    produce(q, 2)
    consume(q).then(console.log)
    consume(q).then(console.log)
    produce(q, 3)
    produce(q, 4)
    consume(q).then(console.log)
    consume(q).then(console.log)
    produce(q, 5)
})()

