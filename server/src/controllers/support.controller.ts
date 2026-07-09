import { Request, Response, NextFunction } from 'express';
import SupportTicket from '../models/SupportTicket';
import { AuthRequest } from '../types';
import { sendSuccess, sendError, getPagination } from '../utils/apiResponse';
import { emitEvent, SOCKET_EVENTS } from '../config/socket';

export const createTicket = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { subject, category, description, images } = req.body;
    const ticket = await SupportTicket.create({
      user: req.user!._id,
      subject,
      category,
      description,
      images,
      messages: [{
        sender: req.user!._id,
        senderRole: 'customer',
        content: description,
        isInternal: false,
      }],
    });
    emitEvent(SOCKET_EVENTS.ticketNew, {
      ticketId: String(ticket._id),
      subject: ticket.subject,
      category: ticket.category,
      customerName: req.user!.name,
    });
    sendSuccess(res, 'Support ticket created', ticket, 201);
  } catch (err) {
    next(err);
  }
};

export const getMyTickets = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tickets = await SupportTicket.find({ user: req.user!._id })
      .sort('-createdAt')
      .select('-messages')
      .lean();
    sendSuccess(res, 'Tickets fetched', tickets);
  } catch (err) {
    next(err);
  }
};

export const getTicketById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ticket = await SupportTicket.findOne({
      _id: req.params.id,
      user: req.user!._id,
    }).populate('messages.sender', 'name role');

    if (!ticket) { sendError(res, 'Ticket not found', 404); return; }
    sendSuccess(res, 'Ticket details', ticket);
  } catch (err) {
    next(err);
  }
};

export const addMessage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { content, isInternal = false } = req.body;
    const isAdmin = req.user!.role !== 'customer';

    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) { sendError(res, 'Ticket not found', 404); return; }

    if (!isAdmin && ticket.user.toString() !== req.user!._id.toString()) {
      sendError(res, 'Forbidden', 403);
      return;
    }

    ticket.messages.push({
      sender: req.user!._id,
      senderRole: req.user!.role,
      content,
      isInternal: isAdmin ? isInternal : false,
      createdAt: new Date(),
    });

    if (ticket.status === 'closed') ticket.status = 'open';
    await ticket.save();
    sendSuccess(res, 'Message added', ticket);
  } catch (err) {
    next(err);
  }
};

export const getAllTickets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, status, priority } = req.query as Record<string, string>;
    const { page: p, limit: l, skip } = getPagination(page, limit);

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const [tickets, total] = await Promise.all([
      SupportTicket.find(filter)
        .populate('user', 'name email')
        .populate('assignedTo', 'name')
        .sort('-createdAt')
        .skip(skip)
        .limit(l)
        .select('-messages')
        .lean(),
      SupportTicket.countDocuments(filter),
    ]);

    sendSuccess(res, 'Tickets fetched', tickets, 200, {
      page: p, limit: l, total, pages: Math.ceil(total / l),
    });
  } catch (err) {
    next(err);
  }
};

export const updateTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, priority, assignedTo } = req.body;
    const update: Record<string, unknown> = {};
    if (status) { update.status = status; if (status === 'resolved') update.resolvedAt = new Date(); }
    if (priority) update.priority = priority;
    if (assignedTo) update.assignedTo = assignedTo;

    const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!ticket) { sendError(res, 'Ticket not found', 404); return; }
    sendSuccess(res, 'Ticket updated', ticket);
  } catch (err) {
    next(err);
  }
};
