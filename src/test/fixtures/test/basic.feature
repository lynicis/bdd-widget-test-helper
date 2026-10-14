Feature: Basic feature
  Scenario: Basic scenario
    Given the app is running
    When I tap text
    Then I see {'hello'} text
    And I fill the form
