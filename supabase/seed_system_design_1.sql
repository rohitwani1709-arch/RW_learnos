-- SAMPLE CONTENT: System Design course shell + first lessons. Safe to re-run.
-- Module 5 (company case studies) is intentionally empty until each case study is written from
-- the company's own published engineering material and checked.
insert into public.courses (slug, title, description, level, subject, language, learning_objectives, prerequisites, status)
values (
  'system-design',
  'System Design: Core Concepts and Case Studies',
  'Learn how large systems are designed: requirements, estimation, scaling, caching, storage, messaging and reliability, then study how real companies describe their own architectures.',
  'intermediate', 'computer-science', 'en',
  array['Turn vague requirements into a clear design problem','Estimate traffic, storage and bandwidth','Explain load balancing, caching, replication, sharding and queues, and their trade-offs','Read and critique published architecture case studies'],
  array['Comfortable with basic programming','Basic idea of how web applications and databases work'],
  'published'
) on conflict (slug) do nothing;

insert into public.course_modules (course_id, title, position)
select c.id, t.title, t.ord
from public.courses c,
  unnest(array[
    'Foundations: requirements and estimation',
    'Scaling building blocks: load balancing and caching',
    'Data storage: indexes, replication and sharding',
    'Communication and reliability: queues, consistency and failure',
    'Company case studies from public engineering sources',
    'Design practice'
  ]) with ordinality as t(title, ord)
where c.slug = 'system-design'
on conflict (course_id, position) do nothing;

insert into public.lessons (module_id, course_id, slug, title, estimated_minutes, position, content_md)
select m.id, m.course_id, 'requirements-and-estimation', 'Requirements and back-of-envelope estimation', 12, 1, $md$
A system design problem is rarely "build X". It is "build X for these users, at this scale, with these priorities". Your first job is to pin that down.

## Step 1: clarify requirements

- **Functional requirements**: what the system must do. For a photo-sharing app: upload a photo, view a feed, follow users.
- **Non-functional requirements**: how well it must do it. Latency, availability, durability, consistency, cost.
- **Out of scope**: say what you are *not* building, so the discussion stays focused.

## Step 2: estimate the load

Rough numbers decide the design. A single database handles very different loads than a cluster does.

**Worked example.** Assume 10 million daily active users, each making 10 requests a day.

- Requests per day: 10 million × 10 = 100 million
- A day has 86,400 seconds, so the average is about 100,000,000 / 86,400 ≈ **1,160 requests per second**
- Traffic is uneven, so plan for a peak of a few times the average, say 3,000 to 4,000 requests per second

**Storage.** If 1 million photos are uploaded a day at about 500 KB each:

- 1,000,000 × 500 KB = 500 GB per day
- 500 GB × 365 ≈ **180 TB per year**, before replicas or thumbnails

## Reading the numbers

About 1,000 requests per second is within reach of a well-tuned single service. 180 TB a year is not a single-database problem. That tells you object storage is needed for the photos, while a database holds the metadata.

## Common mistakes

- Jumping to a design before asking about scale.
- Pretending estimates are exact. State your assumptions out loud, then use round numbers.
- Forgetting the read/write ratio. A feed is read far more than it is written, which favours caching.

## Try it yourself

For a URL shortener with 100 million new links a month, estimate writes per second and storage per year if each record is 500 bytes. State your assumptions.
$md$
from public.course_modules m join public.courses c on c.id = m.course_id
where c.slug = 'system-design' and m.position = 1
on conflict do nothing;

insert into public.lessons (module_id, course_id, slug, title, estimated_minutes, position, content_md)
select m.id, m.course_id, 'scaling-and-load-balancing', 'Scaling and load balancing', 12, 1, $md$
## Vertical and horizontal scaling

- **Vertical scaling** means a bigger machine: more CPU, memory or disk. It is simple, but it has a ceiling and one machine is a single point of failure.
- **Horizontal scaling** means more machines sharing the work. It scales further and tolerates failures, but the software must be designed for it.

## Stateless servers

Horizontal scaling works best when any server can handle any request. That means servers keep no user-specific data in their own memory. Session data goes to a shared store such as a database or cache. Then you can add or remove servers freely.

## What a load balancer does

A **load balancer** sits in front of your servers and spreads incoming requests across them. It also performs **health checks**: a server that stops responding is taken out of rotation.

## Choosing where a request goes

| Strategy | Idea | Good when |
|---|---|---|
| Round robin | Rotate through servers in order | Requests cost about the same |
| Least connections | Pick the server with the fewest active connections | Requests vary in duration |
| Hashing (for example on user ID) | Same key always reaches the same server | Local caches should stay useful |

## Layer 4 and layer 7

- **Layer 4** balancers route by network information (IP and port). They are fast and simple.
- **Layer 7** balancers understand HTTP, so they can route by URL path or header, terminate TLS, and apply rules.

## Trade-offs and pitfalls

- **Sticky sessions** (always sending a user to the same server) are easy but make failures and scaling harder. Prefer shared session storage.
- The load balancer itself can become a single point of failure, so production setups run several of them.
- Health checks must test something meaningful, or the balancer keeps sending traffic to a broken server.

## Try it yourself

A service has three servers and one request type that sometimes takes 10 seconds. Which balancing strategy would you pick, and why?
$md$
from public.course_modules m join public.courses c on c.id = m.course_id
where c.slug = 'system-design' and m.position = 2
on conflict do nothing;

insert into public.lessons (module_id, course_id, slug, title, estimated_minutes, position, content_md)
select m.id, m.course_id, 'caching', 'Caching', 14, 2, $md$
A **cache** keeps a copy of data in a faster place so repeated requests avoid slow work. Caches exist at every level: browser, CDN, application memory, a shared store such as Redis, and the database's own memory.

## Cache-aside (the most common pattern)

1. The application asks the cache for a key.
2. **Hit:** return the cached value.
3. **Miss:** read from the database, store the result in the cache, return it.

```python
def get_user(user_id):
    user = cache.get(f"user:{user_id}")
    if user is not None:
        return user                      # hit
    user = db.fetch_user(user_id)        # miss: go to the source
    cache.set(f"user:{user_id}", user, ttl=300)
    return user
```

## The hard part: keeping data fresh

- **TTL (time to live):** entries expire after a set time. Simple, but data can be stale until then.
- **Invalidate on write:** delete or update the cache entry when the database row changes. Fresher, but you must not forget any write path.

## Eviction

A cache is smaller than the data behind it, so it must drop entries. **LRU** (least recently used) removes the entry unused for the longest time. The right choice depends on your access pattern.

## Measuring a cache

The **hit ratio** is hits divided by total lookups. If 90 of 100 lookups hit, the ratio is 90%. Even a high ratio only helps if the misses are not catastrophic.

## Failure modes

- **Stale data** after missed invalidation.
- **Cache stampede:** a popular entry expires and many requests rush to the database at once. Mitigations include small random TTL variation and letting one request rebuild the value while others wait.
- **Cold start:** an empty cache sends all traffic to the database.
- **Caching the wrong thing:** data that changes constantly or is rarely reused gains little.

## Try it yourself

A product page is read 1,000 times for every price change. Describe a caching approach, and decide whether a stale price for 5 minutes is acceptable for this feature.
$md$
from public.course_modules m join public.courses c on c.id = m.course_id
where c.slug = 'system-design' and m.position = 2
on conflict do nothing;

insert into public.lessons (module_id, course_id, slug, title, estimated_minutes, position, content_md)
select m.id, m.course_id, 'indexes-replication-sharding', 'Indexes, replication and sharding', 15, 1, $md$
Three techniques account for most database scaling decisions. Each solves a different problem and each has a cost.

## Indexes: faster reads on one machine

An **index** is a separate structure (commonly a B-tree) that lets the database find rows without scanning the whole table.

```sql
CREATE INDEX idx_orders_user_created ON orders (user_id, created_at);
```

- Good for queries that filter or sort on the indexed columns.
- **Cost:** every write must also update the index, and the index takes space.
- In a multi-column index, order matters. The index above helps queries on `user_id`, or `user_id` and `created_at`, but not `created_at` alone.

## Replication: more copies

In **leader-follower replication**, writes go to the leader and are copied to followers. Followers can serve reads and can take over if the leader fails.

- Helps with **read scaling** and **availability**.
- **Replication lag:** a follower may be slightly behind. A user could save a change and then read an older value from a follower.
- It does not help with write volume, because every write still reaches the leader.

## Sharding: splitting the data

**Sharding** divides data across several databases, each holding part of it.

| Approach | How | Weakness |
|---|---|---|
| Range (for example by ID range) | Contiguous ranges per shard | Hot shards if new data clusters at one end |
| Hash of a key | Hash decides the shard | Range queries span all shards |

- Helps with **write volume** and **total data size**.
- **Costs:** queries across shards are hard, joins across shards are harder, and changing the number of shards later is a major operation.

## Which to reach for first

1. Add indexes and fix slow queries.
2. Add caching and read replicas.
3. Shard only when one machine's write capacity or storage genuinely cannot cope.

## Try it yourself

A table has 2 billion rows and is queried mostly by `user_id`. What would you choose as a shard key, and which query would become awkward?
$md$
from public.course_modules m join public.courses c on c.id = m.course_id
where c.slug = 'system-design' and m.position = 3
on conflict do nothing;
