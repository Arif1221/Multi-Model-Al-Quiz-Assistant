import { describe, expect, it } from 'vitest';
import { QuizDetectorService } from '../features/quiz/QuizDetectorService';

describe('QuizDetectorService', () => {
  it('detects lettered multiple-choice questions from visible text', () => {
    const detector = new QuizDetectorService();

    const questions = detector.detectFromText(`
      What is the capital of France?
      A. London
      B. Berlin
      C. Paris
      D. Rome
    `);

    expect(questions).toHaveLength(1);
    expect(questions[0].question).toBe('What is the capital of France?');
    expect(questions[0].options.map((option) => option.text)).toEqual([
      'London',
      'Berlin',
      'Paris',
      'Rome'
    ]);
  });

  it('detects numbered options', () => {
    const detector = new QuizDetectorService();

    const questions = detector.detectFromText(`
      Which gas do plants absorb during photosynthesis?
      1. Oxygen
      2. Carbon dioxide
      3. Nitrogen
      4. Hydrogen
    `);

    expect(questions).toHaveLength(1);
    expect(questions[0].options[1].label).toBe('2');
    expect(questions[0].options[1].text).toBe('Carbon dioxide');
  });

  it('detects plain letter labels used by custom quiz widgets', () => {
    const detector = new QuizDetectorService();

    const questions = detector.detectFromText(`
      Nitrogen is the lightest member of what group in the periodic table?
      A 15
      B 1
      C 18
      D 13
    `);

    expect(questions).toHaveLength(1);
    expect(questions[0].question).toBe(
      'Nitrogen is the lightest member of what group in the periodic table?'
    );
    expect(questions[0].options.map((option) => option.text)).toEqual(['15', '1', '18', '13']);
  });

  it('detects radio-button style questions from DOM', () => {
    document.body.innerHTML = `
      <form>
        <fieldset>
          <legend>What does HTML stand for?</legend>
          <label><input type="radio" name="html" value="a" /> Hyper Trainer Marking Language</label>
          <label><input type="radio" name="html" value="b" /> Hyper Text Markup Language</label>
          <label><input type="radio" name="html" value="c" /> High Text Machine Language</label>
        </fieldset>
      </form>
    `;

    const detector = new QuizDetectorService();
    const questions = detector.detectFromDocument(document);

    expect(questions[0].question).toContain('What does HTML stand for?');
    expect(questions[0].options).toHaveLength(3);
    expect(questions[0].source).toBe('form');
  });
});
