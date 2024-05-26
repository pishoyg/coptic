import typing

import type_enforced

Callable = typing.Callable | type_enforced.enforcer.FunctionMethodEnforcer
OptionalCallable = typing.Optional[Callable]
