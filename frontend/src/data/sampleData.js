export const SAMPLE_LECTURE_TITLE = "CS 301: Concurrency, Synchronization & Deadlocks";

export const SAMPLE_LECTURE_CONTENT = `# Computer Science 301: Operating Systems & Systems Programming
## Lecture 07: Concurrency, Synchronization, and Deadlocks

### 1. The Critical Section Problem
When multiple threads or processes execute concurrently, concurrent access to shared data may result in data inconsistency. Maintaining data consistency requires mechanisms to ensure the orderly execution of cooperating processes. A critical section is a piece of code that accesses a shared resource (such as data structures or device registers) that must not be concurrently accessed by more than one thread of execution.

Any valid solution to the critical section problem must satisfy three requirements:
1. Mutual Exclusion: If process Pi is executing in its critical section, then no other processes can be executing in their critical sections.
2. Progress: If no process is executing in its critical section and some processes wish to enter, only those processes not in their remainder sections can participate in deciding who will enter next.
3. Bounded Waiting: There must be a bound on the number of times other processes are allowed to enter their critical sections after a process has made a request to enter.

### 2. Synchronization Primitives: Mutex vs. Binary Semaphore
- Mutex (Mutual Exclusion Lock): A locking mechanism used to synchronize access to a resource. It is owned by the thread that acquires it. Only the thread that locked the mutex can unlock it.
- Semaphore: A signaling mechanism introduced by Edsger Dijkstra. A semaphore S is an integer variable that, apart from initialization, is accessed only through two standard atomic operations: wait() and signal().
  - wait(S): Decrements the semaphore value. If the value becomes negative, the calling process is blocked.
  - signal(S): Increments the semaphore value. If there are blocked processes, one is unblocked.
- Key Difference: A mutex has the concept of ownership (only the lock holder can release it), whereas a semaphore does not have ownership.

### 3. Deadlock Dynamics and the Four Coffman Conditions
A deadlock occurs when a set of concurrent processes are permanently blocked because each process is holding a resource and waiting for another resource held by another process in the same set.

A system deadlock can arise if and only if the following four Coffman conditions hold simultaneously:
1. Mutual Exclusion: At least one resource must be held in a non-shareable mode.
2. Hold and Wait: A process must be currently holding at least one resource and simultaneously waiting to acquire additional resources held by other processes.
3. No Preemption: Resources cannot be forcibly taken away; they can be released only voluntarily by the process holding it.
4. Circular Wait: A closed chain of processes must exist, such that each process holds one or more resources needed by the next process in the chain.

### 4. Deadlock Handling Strategies
1. Deadlock Prevention: Eliminates deadlock by designing system resource allocation protocols so that at least one of the four Coffman conditions cannot hold (e.g., imposing total resource ordering to eliminate circular wait).
2. Deadlock Avoidance: Uses dynamic runtime state inspection (e.g., Dijkstra's Banker's Algorithm) to ensure that the system never enters an unsafe state.
3. Deadlock Detection and Recovery: Allows the system to enter a deadlocked state, periodically runs detection algorithms, and recovers by aborting processes or preempting resources.`;

export const SAMPLE_STUDENTS = [
  {
    student_id: "STU-001",
    student_name: "Alice Chen (High Scorer)",
    expected_grade_tier: "90-100%",
    submission_text: `A mutex provides mutual exclusion with explicit thread ownership: only the thread that locks the mutex can release it. A binary semaphore is fundamentally a signaling primitive without ownership; any cooperating thread or handler can execute wait() and signal() to synchronize events.

A system deadlock arises if and only if all four Coffman conditions occur simultaneously:
1. Mutual Exclusion: Resources are held in non-shareable mode.
2. Hold and Wait: A process holds at least one resource while waiting for other allocated resources.
3. No Preemption: Resources cannot be forcibly expropriated; they must be voluntarily released.
4. Circular Wait: A closed chain of processes exists where each process waits for a resource held by the next process.

To prevent deadlocks, the OS can break the Circular Wait condition by establishing a global strict ordering on all resource types and requiring processes to request resources in strictly ascending numerical order.`
  },
  {
    student_id: "STU-002",
    student_name: "Bob Miller (Average Scorer)",
    expected_grade_tier: "65-75%",
    submission_text: `Mutex and binary semaphore are both used to lock critical sections. The main difference is semaphore uses wait and signal while mutex is a lock. Deadlocks happen when processes get stuck waiting on each other. The conditions for deadlocks are mutual exclusion and circular waiting where processes wait in a circle. You can prevent deadlocks by not letting processes wait too long or restarting them.`
  },
  {
    student_id: "STU-003",
    student_name: "Charlie Davis (Failing Scorer)",
    expected_grade_tier: "<50%",
    submission_text: `A mutex is a hardware wire that connects the CPU to RAM. Semaphores are used to speed up sorting algorithms by caching memory. Deadlock means the computer crashed because of an infinite loop in python code. To prevent deadlock we should restart the computer.`
  }
];
