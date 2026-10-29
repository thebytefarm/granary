<standard id="immutable-values">

## Immutable values

<why>

Callers may retain the original value. Returning a new value preserves the caller's state — including names such as Zoë.

</why>

<rules>

<rule id="preserve-inputs">

- <level>MUST NOT</level> mutate function arguments.

<enforcement>
[review]
Inspect the resource boundary as well as the pure transformation.
</enforcement>

</rule>

<rule id="return-new-values">

- <level>MUST</level> return a new value when changing domain data.

<enforcement>
[review]
</enforcement>

</rule>

</rules>

<examples>

### Append a value

Keep the original array intact.

```ts
function appendName(names: readonly string[], name: string): readonly string[] {
  return [...names, name]
}
```

Example markup is code, not another authored rule:

```xml
<rule id="example-only"><level>MAY</level> illustrate a tag.</rule>
```

</examples>

</standard>
