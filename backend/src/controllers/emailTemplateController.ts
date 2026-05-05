import { Request, Response } from 'express';
import EmailTemplate from '../models/EmailTemplate';

export const getTemplates = async (req: Request, res: Response): Promise<void> => {
  try {
    const templates = await EmailTemplate.find({});
    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching templates', error });
  }
};

export const getTemplateById = async (req: Request, res: Response): Promise<void> => {
  try {
    const template = await EmailTemplate.findById(req.params.id);
    if (!template) {
      res.status(404).json({ message: 'Template not found' });
      return;
    }
    res.json(template);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching template', error });
  }
};

export const createTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, subject, htmlContent, variables, description } = req.body;
    
    const existing = await EmailTemplate.findOne({ name });
    if (existing) {
      res.status(400).json({ message: 'Template with this name already exists' });
      return;
    }

    const template = await EmailTemplate.create({
      name,
      subject,
      htmlContent,
      variables,
      description
    });
    
    res.status(201).json(template);
  } catch (error) {
    res.status(500).json({ message: 'Server Error creating template', error });
  }
};

export const updateTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, subject, htmlContent, variables, description } = req.body;
    
    const template = await EmailTemplate.findById(req.params.id);
    if (!template) {
      res.status(404).json({ message: 'Template not found' });
      return;
    }

    if (name) template.name = name;
    if (subject) template.subject = subject;
    if (htmlContent) template.htmlContent = htmlContent;
    if (variables) template.variables = variables;
    if (description !== undefined) template.description = description;

    const updatedTemplate = await template.save();
    res.json(updatedTemplate);
  } catch (error) {
    res.status(500).json({ message: 'Server Error updating template', error });
  }
};

export const deleteTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const template = await EmailTemplate.findByIdAndDelete(req.params.id);
    if (!template) {
      res.status(404).json({ message: 'Template not found' });
      return;
    }
    res.json({ message: 'Template removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error deleting template', error });
  }
};
