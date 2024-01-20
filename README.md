# Beam

Functional optics and transducers sharing a destiny. This is mostly exploratory work for now. Although I do care about code quality, don't use this in production.

## Transducers

Transducers were first introduced to closure in [2014](https://clojure.org/news/2014/08/06/transducers-are-coming) by Rich Hickey. They adress the following problems:
    - having a common representation for `map`, `filter` and the like on different data structures (and making such operations extensible);
    - processing data without creating unnecessary intermediate structures.

As such, they solve problems typically adressed with monads in traditional functional programming languages. But as they offer an explicit way to terminate evaluation, they are a better fit for eagerly evaluated languages.

Transducers have blossomed in JavaScript around 2015 but seem to have been abandoned. One possible explanation is that they are, in the word of their creator, ["an interesting type problem"](https://www.youtube.com/watch?v=6mTbuzafcII&t=1677s). Typescript implementations I have found all relied on type declarations or `any`. I here propose a well typed implementation. The API is also designed to offer proper type inference.

