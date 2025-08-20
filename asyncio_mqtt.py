class Client:
    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        pass

    async def connect(self, *args, **kwargs):
        pass

    async def disconnect(self, *args, **kwargs):
        pass

    async def publish(self, *args, **kwargs):
        pass

    async def subscribe(self, *args, **kwargs):
        pass

    def messages(self):
        class _CM:
            async def __aenter__(self_inner):
                return self_inner

            async def __aexit__(self_inner, exc_type, exc, tb):
                pass

            def __aiter__(self_inner):
                return self_inner

            async def __anext__(self_inner):
                raise StopAsyncIteration

        return _CM()
