import * as assert from 'assert';
import { parseListTable } from '../extension';

suite('parseListTable Tests', () => {
    test('Empty input string should return empty array', () => {
        const input = '';
        const expected: any[] = [];
        const result = parseListTable(input);
        assert.deepStrictEqual(result, expected);
    });

    test('Single row with single cell', () => {
        const input = '* - Cell content';
        const expected = [{ col1: 'Cell content' }];
        const result = parseListTable(input);
        assert.deepStrictEqual(result, expected);
    });

    test('Multiple rows with single cell each', () => {
        const input = `
* - Row 1
* - Row 2
* - Row 3
        `;
        const expected = [
            { col1: 'Row 1' },
            { col1: 'Row 2' },
            { col1: 'Row 3' },
        ];
        const result = parseListTable(input);
        assert.deepStrictEqual(result, expected);
    });

    test('Single row with multiple cells', () => {
        const input = `
* - Cell 1
  - Cell 2
  - Cell 3
        `;
        const expected = [{ col1: 'Cell 1', col2: 'Cell 2', col3: 'Cell 3' }];
        const result = parseListTable(input);
        assert.deepStrictEqual(result, expected);
    });

    test('Multiple rows with multiple cells', () => {
        const input = `
* - Row1 Cell1
  - Row1 Cell2
* - Row2 Cell1
  - Row2 Cell2
        `;
        const expected = [
            { col1: 'Row1 Cell1', col2: 'Row1 Cell2' },
            { col1: 'Row2 Cell1', col2: 'Row2 Cell2' },
        ];
        const result = parseListTable(input);
        assert.deepStrictEqual(result, expected);
    });

    test('Cells with multiline content', () => {
        const input = `
* - Cell 1 Line 1
    Cell 1 Line 2
    Cell 1 Line 3
  - Cell 2 Line 1
    Cell 2 Line 2
        `;
        const expected = [
            {
                col1: 'Cell 1 Line 1\nCell 1 Line 2\nCell 1 Line 3',
                col2: 'Cell 2 Line 1\nCell 2 Line 2',
            },
        ];
        const result = parseListTable(input);
        assert.deepStrictEqual(result, expected);
    });

    test('Input with varying indentation', () => {
        const input = `
* - Cell1
    - SubCell1
      SubCell1 continued
  - Cell2
* - Cell3
    - Cell4
  - Cell3
    - Cell4
        `;
        const expected = [
            {
                col1: 'Cell1\n- SubCell1\n  SubCell1 continued',
                col2: 'Cell2',
            },
            {
                col1: 'Cell3\n- Cell4',
                col2: 'Cell3\n- Cell4',
            },
        ];
        const result = parseListTable(input);
        assert.deepStrictEqual(result, expected);
    });

    test('Rows with different number of cells', () => {
        const input = `
* - Row1 Cell1
  - Row1 Cell2
  - Row1 Cell3
* - Row2 Cell1
  - Row2 Cell2
* - Row3 Cell1
        `;
        const expected = [
            { col1: 'Row1 Cell1', col2: 'Row1 Cell2', col3: 'Row1 Cell3' },
            { col1: 'Row2 Cell1', col2: 'Row2 Cell2' },
            { col1: 'Row3 Cell1' },
        ];
        const result = parseListTable(input);
        assert.deepStrictEqual(result, expected);
    });
});
