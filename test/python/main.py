import testcontract, registry_tests.noowners, registry_tests.withsigs

testcontract.runTests()
registry_tests.noowners.runTests()
registry_tests.withsigs.runTests()
