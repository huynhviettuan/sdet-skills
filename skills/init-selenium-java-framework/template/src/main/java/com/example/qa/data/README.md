# data

Test-data factories (one per entity), registered in `context/TestData.java`. Each creates data through a service
and registers its cleanup with `TestContext.onTeardown(...)`.
