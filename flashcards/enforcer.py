import typing

import type_enforced

ENABLED = False

Callable = typing.Callable | type_enforced.enforcer.FunctionMethodEnforcer
OptionalCallable = typing.Optional[Callable]
