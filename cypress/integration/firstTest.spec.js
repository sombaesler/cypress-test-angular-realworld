/// <reference types="cypress" /> 

describe('Test with backend', () => {

    beforeEach('log in to the app', () => {

        cy.intercept({ method: 'GET', path: 'tags' }, { fixture: 'tags.json' })
        cy.loginToApplication()

    })

    it('verify correct request and response', () => {

        cy.intercept({
            method: 'POST',
            path: 'articles',
            url: 'https://api.realworld.io/api/articles/'
        }).as('postArticles')

        cy.contains('New Article').click()
        cy.get('[formcontrolname="title"]').type('Testing req & res')
        cy.get('[formcontrolname="description"]').type('This is description')
        cy.get('[formcontrolname="body"]').type('This is a body')
        cy.contains('Publish Article').click()

        cy.wait('@postArticles').then((xhr) => {
            console.log(xhr)
            expect(xhr.request.body.article.body).to.equal('This is a body')
            expect(xhr.response.statusCode).to.equal(200)
            expect(xhr.response.body.article.description).to.equal('This is description')
        })
    })

    it('intercept and modify the request and response', () => {

        cy.intercept({
            method: 'POST',
            path: 'articles',
            url: 'https://api.realworld.io/api/articles/'
        },
            (req) => {
                req.body.article.description = "This is description 2"
                req.reply((res) => {
                    expect(res.body.article.description).to.equal('This is description 2')
                    res.body.article.description = "This is description 3"
                })
            }).as('postArticles')

        cy.contains('New Article').click()
        cy.get('[formcontrolname="title"]').type('Modifying req & res')
        cy.get('[formcontrolname="description"]').type('This is description')
        cy.get('[formcontrolname="body"]').type('This is a body')
        cy.contains('Publish Article').click()

        cy.wait('@postArticles').then((xhr) => {
            console.log(xhr)
            expect(xhr.request.body.article.body).to.equal('This is a body')
            expect(xhr.response.statusCode).to.equal(200)
            expect(xhr.response.body.article.description).to.equal('This is description 3')
        })
    })

    it('should give tags with routing objects', () => {
        cy.get('.tag-list')
            .should('contain', 'cypress')
            .and('contain', 'automation')
            .and('contain', 'testing')
    })

    it('verify global feed likes count', () => {
        cy.intercept('GET', '**/articles/feed*', { "articles": [], "articlesCount": 0 })
        cy.intercept('GET', '**/articles*', { fixture: 'articles.json' })

        cy.contains('Global Feed').click()
        cy.get('app-article-list button').then(listOfButtons => {
            expect(listOfButtons[0]).to.contain('1')
            expect(listOfButtons[1]).to.contain('5')
        })

        cy.fixture('articles').then(file => {
            const articleLink = file.articles[1].slug
            cy.intercept('POST', '**/articles/' + articleLink + 'favorite', file)
        })

        cy.get('app-article-list button')
            .eq(1)
            .click()
            .should('contain', '6')
    })

    it('delete a new article in a global feed', () => {
        
        const bodyRequest = {
            "article": {
                "tagList": [
                    "tag",
                    "tag2"
                ],
                "title": "A request from api",
                "description": "API testing is easy",
                "body": "Angular is cool"
            }
        }

        cy.get('@token').then(token => {

                cy.request({
                    url: 'https://api.realworld.io/api/articles/',
                    headers: { 'Authorization': 'Token ' + token },
                    method: 'POST',
                    body: bodyRequest
                }).then(response => {
                    expect(response.status).to.equal(200)
                })

                cy.contains('Global Feed').click()
                cy.get('.article-preview').first().click()
                cy.get('.article-actions').contains('Delete Article').click()
                cy.contains('Global Feed').click()

                cy.request({
                    url: 'https://api.realworld.io/api/articles?limit=10&offset=0',
                    headers: { 'Authorization': 'Token ' + token },
                    method: 'GET',
                }).its('body').then(body => {
                    expect(body.articles[0].title).not.to.equal('A request from api')
                })
            })
    })
})