-- SAMPLE CONTENT: DSA with Python, lessons for modules 1 and 2. Safe to re-run.
insert into public.lessons (module_id, course_id, slug, title, estimated_minutes, position, content_md)
select m.id, m.course_id, 'thinking-about-problems', 'How to think about a problem', 8, 1, $md$
Before writing any code, good programmers follow a routine. It works for every problem in this course.

## The six steps

1. **Understand** the problem. Say it in your own words.
2. **Try examples** by hand, including a tiny one.
3. **List edge cases**: empty input, one item, duplicates, negative numbers.
4. **Plan** the steps in plain language.
5. **Code** the plan.
6. **Test** with your examples and edge cases.

## Worked example: find the largest number in a list

Given `[3, 9, 2, 7]` the answer is `9`. By hand, you would look at each number and remember the biggest so far.

Plan: start with the first number as the biggest. For each remaining number, if it is bigger, replace the biggest.

```python
def largest(numbers):
    biggest = numbers[0]
    for n in numbers[1:]:
        if n > biggest:
            biggest = n
    return biggest

print(largest([3, 9, 2, 7]))  # 9
```

## Edge cases

- `[5]` returns `5`. The loop does nothing, which is correct.
- `[-4, -1, -8]` returns `-1`. This is why we start with the first item and not with `0`.
- `[]` crashes with an error, because there is no first item. Deciding what should happen here is part of understanding the problem.

## Try it yourself

Write the plan, in words only, for finding the smallest number in a list. Then list three edge cases you would test.
$md$
from public.course_modules m join public.courses c on c.id = m.course_id
where c.slug = 'dsa-python' and m.position = 1
on conflict do nothing;

insert into public.lessons (module_id, course_id, slug, title, estimated_minutes, position, content_md)
select m.id, m.course_id, 'python-basics', 'Python basics: values, types and output', 10, 2, $md$
This lesson covers the small set of Python features you need to read the rest of the course.

## Values and variables

A **variable** is a name attached to a value.

```python
age = 19          # int, a whole number
price = 49.5      # float, a number with a decimal point
name = "Asha"     # str, text
passed = True     # bool, either True or False
```

Use `type(age)` to check what kind of value a variable holds.

## Output and formatted text

```python
print("Hello,", name)
print(f"{name} is {age} years old")   # f-string: values go inside { }
```

## Arithmetic

| Expression | Result |
|---|---|
| `7 + 2` | `9` |
| `7 / 2` | `3.5` (always a float) |
| `7 // 2` | `3` (whole-number division) |
| `7 % 2` | `1` (the remainder) |
| `2 ** 3` | `8` (power) |

The remainder operator `%` appears constantly in algorithms. For example, `n % 2 == 0` checks whether `n` is even.

## Common mistakes

- `=` assigns a value; `==` compares two values.
- `"5" + 3` is an error, because text and numbers do not mix. Use `int("5") + 3`.
- Python uses indentation to show structure, so keep the spacing consistent.

## Try it yourself

Create variables for your name and your birth year. Print one sentence that says how old you will be in 2030.
$md$
from public.course_modules m join public.courses c on c.id = m.course_id
where c.slug = 'dsa-python' and m.position = 1
on conflict do nothing;

insert into public.lessons (module_id, course_id, slug, title, estimated_minutes, position, content_md)
select m.id, m.course_id, 'conditions-and-loops', 'Conditions and loops', 12, 1, $md$
Algorithms are built from two ideas: **making decisions** and **repeating work**.

## Conditions

```python
score = 72
if score >= 75:
    print("Distinction")
elif score >= 40:
    print("Pass")
else:
    print("Fail")
```

Python checks the conditions from top to bottom and runs only the first block that matches.

## for loops

A `for` loop visits each item in a sequence.

```python
for n in [4, 8, 15]:
    print(n)

for i in range(5):        # i is 0, 1, 2, 3, 4
    print(i)
```

`range(5)` stops **before** 5. `range(2, 6)` gives 2, 3, 4, 5.

## while loops

A `while` loop repeats as long as its condition is true.

```python
count = 0
while count < 3:
    print(count)
    count += 1            # without this line the loop never ends
```

## Worked example: sum of the even numbers up to 10

```python
total = 0
for n in range(1, 11):
    if n % 2 == 0:
        total += n
print(total)  # 30
```

## Common mistakes

- **Off-by-one errors.** `range(1, 10)` does not include 10.
- **Infinite loops.** Forgetting to change the value that the `while` condition checks.
- **Changing a list while looping over it.** Loop over a copy instead.

## Try it yourself

Print all multiples of 3 between 1 and 30, then print how many there are.
$md$
from public.course_modules m join public.courses c on c.id = m.course_id
where c.slug = 'dsa-python' and m.position = 2
on conflict do nothing;

insert into public.lessons (module_id, course_id, slug, title, estimated_minutes, position, content_md)
select m.id, m.course_id, 'functions', 'Functions', 12, 2, $md$
A **function** packages steps under a name so you can reuse them and test them separately.

## Defining and calling

```python
def is_even(n):
    return n % 2 == 0

print(is_even(10))  # True
print(is_even(7))   # False
```

`n` is a **parameter**. The value you pass in, such as `10`, is an **argument**.

## return and print are different

`print` shows something on the screen. `return` hands a value back to the code that called the function. Algorithms almost always need `return`.

```python
def add_wrong(a, b):
    print(a + b)       # shows the result, returns None

def add(a, b):
    return a + b       # gives the result back

total = add(2, 3) * 10  # 50
```

## Several results, default values

```python
def min_max(numbers):
    return min(numbers), max(numbers)

low, high = min_max([4, 9, 1])   # low = 1, high = 9

def greet(name, greeting="Hello"):
    return f"{greeting}, {name}"
```

## Worked example: counting a value

```python
def count_value(items, target):
    count = 0
    for item in items:
        if item == target:
            count += 1
    return count

print(count_value([1, 2, 2, 3, 2], 2))  # 3
```

## Common mistakes

- Forgetting `return`, so the function gives back `None`.
- Using a variable defined inside a function from outside it. Variables inside a function exist only while it runs.
- Changing a list that was passed in without meaning to.

## Try it yourself

Write `average(numbers)` that returns the average of a list. Decide what should happen for an empty list, and write that decision down.
$md$
from public.course_modules m join public.courses c on c.id = m.course_id
where c.slug = 'dsa-python' and m.position = 2
on conflict do nothing;
