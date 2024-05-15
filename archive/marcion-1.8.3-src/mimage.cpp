/*  Marcion
    Copyright (C) 2009-2016 Milan Konvicka

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along
    with this program; if not, write to the Free Software Foundation, Inc.,
    51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA. */

#include "mimage.h"
//
CMImage::CMImage(QWidget * parent)
        : QGraphicsView(parent),start(),scene(),current(0),
          //_cur_size(),
          sel_rect(0),
        pixmap(),
          popup(),
          popupSel(tr("s&election")),
          selection(),
          sel_pen(QColor(0,0,0)),
          sel_brush(QColor(0,0,0,127)),
          _m_mode(CMImage::Move),
          _s_mode(Normal),
          _i_mode(Image),
          agrp(this),
          agrpSel(this),
          _grid(),_grid_enabled(false),
          _findbutt(0),_nav_butt(0),
          _w(0)
{
    QBrush background_brush;
    background_brush.setTexture(QBitmap(":/new/icons/icons/imgbrush.png"));
    background_brush.setColor(Qt::gray);
    setBackgroundBrush(background_brush);
    viewport()->setCursor(Qt::OpenHandCursor);
    setScene(&scene);
    setContextMenuPolicy(Qt::CustomContextMenu);



    connect(this,SIGNAL(customContextMenuRequested(QPoint)),this,SLOT(slot_customContextMenuRequested(QPoint)));

    agrp.setExclusive(true);
    agrpSel.setExclusive(true);
    //emit mouseModeChanged(CMImage::Move);
}

CMImage::~CMImage()
{
    if(sel_rect)
        delete sel_rect;
    if(current)
        delete current;
    deleteNavigator();
}

//

void CMImage::keyPressEvent(QKeyEvent * e)
{
    if(e->modifiers()==Qt::ControlModifier)
    {
        switch(e->key())
        {
            case Qt::Key_V :
            selectAll();
            e->accept();
            break;
            case Qt::Key_M :
            setMouseMode(Move);
            e->accept();
            break;
            case Qt::Key_S :
            setMouseMode(Select);
            e->accept();
            break;
            case Qt::Key_F :
            if(_findbutt)
                _findbutt->click();
            e->accept();
            break;
            case Qt::Key_G :
            if(_nav_butt)
                _nav_butt->click();
            e->accept();
            break;
            case Qt::Key_T :
            a_sett->setChecked(!a_sett->isChecked());
            emit settingsActivated(a_sett->isChecked());
            e->accept();
            break;
            case Qt::Key_I :
            copyImage();
            e->accept();
            break;
            case Qt::Key_C :
            emit copyTextRequested(selection,Clip);
            e->accept();
            break;
            case Qt::Key_D :
            emit copyTextRequested(selection,Dict);
            e->accept();
            break;
            case Qt::Key_N :
            emit copyTextRequested(selection,Conv);
            e->accept();
            break;
            case Qt::Key_L :
            clearSelection();
            e->accept();
            break;
            case Qt::Key_Plus :
            emit resizeRequested(false);
            e->accept();
            break;
            case Qt::Key_Minus :
            emit resizeRequested(true);
            e->accept();
            break;
            default:
                QGraphicsView::keyPressEvent(e);
                break;
        }
    }
    else if(e->modifiers()&Qt::ControlModifier)
    {
        switch(e->key())
        {
            case Qt::Key_Plus :
            emit resizeRequested(false);
            e->accept();
            break;
            case Qt::Key_Minus :
            emit resizeRequested(true);
            e->accept();
            break;
        default:
            QGraphicsView::keyPressEvent(e);
            break;
        }
    }
    else
        QGraphicsView::keyPressEvent(e);
}

void CMImage::mousePressEvent ( QMouseEvent * e )
{
    QPointF pmap(mapToScene(e->pos()));
    if(e->button()==Qt::LeftButton)
    {
	if(current)
	{
            switch(_m_mode)
            {
            case CMImage::Move :
                start=mapToScene(e->pos()+
                QPoint(viewport()->width()/2,viewport()->height()/2));
                viewport()->setCursor(Qt::ClosedHandCursor);
                break;
            case CMImage::Select :
                scene.update();
                if(_s_mode==Normal)
                {
                    selection.setTopLeft(pmap);
                    selection.setBottomRight(QPoint(pmap.x()+1,pmap.y()+1));
                    emit selectionChanged(selection);
                }
                else
                {
                    if(sel_rect)
                        switch(_s_mode)
                        {
                        case Normal :
                            break;
                            case LeftTop :
                                if(pmap.x()<selection.right()&&pmap.y()<selection.bottom())
                                {
                                    selection.setTopLeft(pmap);
                                    sel_rect->setRect(selection);
                                    emit selectionChanged(selection);
                                }
                                break;
                            case RightTop :
                                if(pmap.x()>selection.left()&&pmap.y()<selection.bottom())
                                {
                                    selection.setTopRight(pmap);
                                    sel_rect->setRect(selection);
                                    emit selectionChanged(selection);
                                }
                                break;
                            case LeftBottom :
                                if(pmap.x()<selection.right()&&pmap.y()>selection.top())
                                {
                                    selection.setBottomLeft(pmap);
                                    sel_rect->setRect(selection);
                                    emit selectionChanged(selection);
                                }
                                break;
                            case RightBottom :
                                if(pmap.x()>selection.left()&&pmap.y()>selection.top())
                                {
                                    selection.setBottomRight(pmap);
                                    sel_rect->setRect(selection);
                                    emit selectionChanged(selection);
                                }
                                break;
                        }
                }
                break;
            }
	}
    }
}

void CMImage::mouseReleaseEvent ( QMouseEvent *  e)
{
    if(e->button()==Qt::LeftButton)
    {
	if(current)
	{
            switch(_m_mode)
            {
            case CMImage::Move :
                viewport()->setCursor(Qt::OpenHandCursor);
                start=QPointF();
                break;
            case CMImage::Select :
                //_s_mode=Normal;
                break;
            }
	}
    }
}

void CMImage::mouseMoveEvent ( QMouseEvent * e )
{
    QPointF pmap(mapToScene(e->pos()));
    if(e->buttons()==Qt::LeftButton)
    {
        if(current)
        {
            switch(_m_mode)
            {
            case CMImage::Move :
                if(!start.isNull())
                {
                    centerOn(start-e->pos());
                }
                break;
            case CMImage::Select :
                if(!selection.isNull())
                {
                    if(_s_mode==Normal)
                    {
                        selection.setBottomRight(pmap);
                        if(sel_rect)
                            sel_rect->setRect(selection);
                        else
                            sel_rect=scene.addRect(selection,sel_pen,sel_brush);
                        emit selectionChanged(selection);
                    }
                    else
                    {
                        if(sel_rect)
                            switch(_s_mode)
                            {
                            case Normal :

                                break;
                            case LeftTop :
                                if(pmap.x()<selection.right()&&pmap.y()<selection.bottom())
                                {
                                    selection.setTopLeft(pmap);
                                    sel_rect->setRect(selection);
                                    emit selectionChanged(selection);
                                }
                                break;
                            case RightTop :
                                if(pmap.x()>selection.left()&&pmap.y()<selection.bottom())
                                {
                                    selection.setTopRight(pmap);
                                    sel_rect->setRect(selection);
                                    emit selectionChanged(selection);
                                }
                                break;
                            case LeftBottom :
                                if(pmap.x()<selection.right()&&pmap.y()>selection.top())
                                {
                                    selection.setBottomLeft(pmap);
                                    sel_rect->setRect(selection);
                                    emit selectionChanged(selection);
                                }
                                break;
                            case RightBottom :
                                if(pmap.x()>selection.left()&&pmap.y()>selection.top())
                                {
                                    selection.setBottomRight(pmap);
                                    sel_rect->setRect(selection);
                                    emit selectionChanged(selection);
                                }
                                break;
                            }
                    }
                }
                break;
            }
        }
    }
    emit positionChanged(pmap);
}

void CMImage::enableGrid(bool enable)
{
    _grid_enabled=enable;
    grid(_grid_enabled);
}

void CMImage::grid(bool show)
{
    if(_i_mode==Map)
    {
        for(int x=0;x<_grid.count();x++)
        {
            scene.removeItem(_grid.at(x));
            delete _grid.at(x);
        }
        _grid.clear();

        if(show)
        {
            QBrush const brush_b((QColor(Qt::black))),
                    brush_r((QColor(Qt::red)));

            double const lg=((double)scene.width())/360,lt=((double)scene.height())/180;

            for(int x=10;x<360;x+=10)
                if(x==180)
                    _grid.append(scene.addLine(lg*x,0,lg*x,scene.height(),QPen(brush_r,2)));
                else if(x%30==0)
                    _grid.append(scene.addLine(lg*x,0,lg*x,scene.height(),QPen(brush_b,1)));
                else
                    _grid.append(scene.addLine(lg*x,0,lg*x,scene.height(),QPen(brush_b,1,Qt::DotLine)));

            for(int y=10;y<180;y+=10)
                if(y==90)
                    _grid.append(scene.addLine(0,lt*y,scene.width(),lt*y,QPen(brush_r,2)));
                else if(y%30==0)
                    _grid.append(scene.addLine(0,lt*y,scene.width(),lt*y,QPen(brush_b,1)));
                else
                    _grid.append(scene.addLine(0,lt*y,scene.width(),lt*y,QPen(brush_b,1,Qt::DotLine)));
        }
    }
}

void CMImage::clearPixmap()
{
    grid(false);
    if(sel_rect)
    {
        scene.removeItem(sel_rect);
        delete sel_rect;
        sel_rect=0;
    }
    if(current)
    {
        delete current;
        current=0;
    }
    scene.clear();
    deleteNavigator();

}

void CMImage::deleteNavigator()
{
    if(_w)
        if(*_w)
        {
            delete *_w;
            *_w=0;
        }
}

void CMImage::setPixmap(QPixmap const & pm)
{
    grid(false);
    if(sel_rect)
    {
        scene.removeItem(sel_rect);
        delete sel_rect;
        sel_rect=0;
    }

    if(current)
    {
        delete current;
        current=0;
    }
    deleteNavigator();

    pixmap=pm;
    current=scene.addPixmap(pm);
}

bool CMImage::loadPage(QString const & filename,qreal stretch,qreal rotate)
{
    USE_CLEAN_WAIT
    m_msg()->MsgMsg(tr("displaying '")+filename+"' ...");

    grid(false);
    if(sel_rect)
    {
        scene.removeItem(sel_rect);
        delete sel_rect;
        sel_rect=0;
    }

	if(current)
		delete current;
	current=0;
    deleteNavigator();

        //QPixmap pixmap(filename);
        //try{
            if(!pixmap.load(filename))
            {
                m_msg()->MsgErr("'"+filename+tr("' not loaded"));
                return false;
            }
        /*}
        catch(...)
        {
            messages->MsgErr("'"+filename+tr("exception"));
            return false;
        }*/

        scale(stretch,rotate);

        centerOn(1,1);

        m_msg()->MsgOk();
        return true;
}

/*void CMImage::init(CMessages * const messages)
{
    CMessages ** m((CMessages**)&this->messages);
    *m=messages;
}*/

void CMImage::scale(qreal zoom,qreal angle)
{
    USE_CLEAN_WAIT
    cancelSelection();
    grid(false);
    emit beforeSceneResized();
    scene.clear();
    QMatrix mt;
    mt.scale(zoom,zoom);
    mt.rotate(angle);
    QPixmap sp(pixmap.transformed(mt));
    scene.setSceneRect(sp.rect());
    current=scene.addPixmap(sp);
    grid(_grid_enabled);
    emit afterSceneResized();
    /*cancelSelection();
    _scale=zoom;
    QGraphicsView::resetMatrix();
    QGraphicsView::scale(_scale,_scale);
    QGraphicsView::rotate(_rotate);*/
}

void CMImage::selectAll()
{
    if(current)
    {
        selection=current->boundingRect();
        if(sel_rect)
            sel_rect->setRect(selection);
        else
            sel_rect=scene.addRect(selection,sel_pen,sel_brush);
        scene.update();
        emit selectionChanged(selection);
    }
}

void CMImage::slot_customContextMenuRequested(QPoint )
{
    if(current)
    {
        switch(_m_mode)
        {
        case CMImage::Move :
            a_move->setChecked(true);
            break;
        case CMImage::Select :
            a_select->setChecked(true);
            break;
        }

        if(a_find&&_findbutt)
            a_find->setChecked(_findbutt->isChecked());
        popupSel.setEnabled(sel_rect&&_m_mode==Select);
        a_copy->setEnabled(sel_rect);
        if(a_copy_text)
            a_copy_text->setEnabled(sel_rect);
        if(a_dictionary)
            a_dictionary->setEnabled(sel_rect);
        if(a_conv)
            a_conv->setEnabled(sel_rect);
        a_clr_selection->setEnabled(sel_rect);

        switch(_s_mode)
        {
        case LeftTop :
            a_sel_lt->setChecked(true);
            break;
        case LeftBottom :
            a_sel_lb->setChecked(true);
            break;
        case RightTop :
            a_sel_rt->setChecked(true);
            break;
        case RightBottom :
            a_sel_rb->setChecked(true);
            break;
        case Normal :
            a_sel_norm->setChecked(true);
            break;
        }

        QAction * a;
        if((a=popup.exec()))
        {
            if(a==a_move)
                setMouseMode(Move);
            else if(a==a_select)
                setMouseMode(Select);
            else if(a==a_select_all)
                selectAll();
            else if(a==a_navigate)
            {
                if(_nav_butt)
                    _nav_butt->click();
            }
            else if(a==a_clr_selection)
                clearSelection();
            else if(a==a_copy)
                copyImage();
            else if(a==a_copy_text)
                emit copyTextRequested(selection,Clip);
            else if(a==a_dictionary)
                emit copyTextRequested(selection,Dict);
            else if(a==a_conv)
                emit copyTextRequested(selection,Conv);
            else if(a==a_links)
                emit showLinksRequested();
            else if(a==a_fonts)
                emit showFontsRequested();
            else if(a==a_sel_lt)
                _s_mode=LeftTop;
            else if(a==a_sel_lb)
                _s_mode=LeftBottom;
            else if(a==a_sel_rt)
                _s_mode=RightTop;
            else if(a==a_sel_rb)
                _s_mode=RightBottom;
            else if(a==a_sel_norm)
                _s_mode=Normal;
            else if(a==a_find)
            {
                if(_findbutt)
                    _findbutt->click();
            }
            else if(a==a_repaint)
                scene.update();
            else if(a==a_sett)
                emit settingsActivated(a_sett->isChecked());
            else if(a==a_zoomplus)
                emit resizeRequested(false);
            else if(a==a_zoomminus)
                emit resizeRequested(true);
        }
    }
}

void CMImage::showPopupOnButton(QAbstractButton * button)
{
    popup.setButton(button);
    slot_customContextMenuRequested(QPoint());
}

/*void CMImage::enablePdfMenu()
{
    a_copy_text->setVisible(true);
}*/

void CMImage::setMouseMode(MouseMode mouse_mode,bool signal)
{
    _s_mode=Normal;
    switch(mouse_mode)
    {
    case Move :
        _m_mode=CMImage::Move;
        /*if(sel_rect)
        {
            scene.removeItem(sel_rect);
            delete sel_rect;
            sel_rect=0;
        }
        selection=QRectF();*/
        viewport()->setCursor(Qt::OpenHandCursor);
        //m_msg()->MsgMsg("mouse mode: move");
        break;
    case Select :
        _m_mode=CMImage::Select;
        viewport()->setCursor(Qt::CrossCursor);
        //m_msg()->MsgMsg("mouse mode: select");
        break;
    }
    if(signal)
        emit mouseModeChanged(_m_mode);
}

void CMImage::setSettingsState(bool state)
{
    a_sett->setChecked(state);
}

void CMImage::setSelectionBorderColor(QColor const & color)
{
    sel_pen.setColor(color);
    if(sel_rect)
        sel_rect->setPen(sel_pen);
}

void CMImage::setSelectionBorderWidth(int width)
{
    sel_pen.setWidth(width);
    if(sel_rect)
        sel_rect->setPen(sel_pen);
}

void CMImage::setSelectionFillColor(QColor const & color)
{
    sel_brush.setColor(color);
    if(sel_rect)
        sel_rect->setBrush(sel_brush);
}

/*void CMImage::setSelectionFillOpacity(int opacity)
{
    QColor c(sel_brush.color());
    c.setAlpha(opacity);
    sel_brush.setColor(c);
    if(sel_rect)
        sel_rect->setBrush(sel_brush);
}*/

void CMImage::cancelSelection()
{
    if(sel_rect)
    {
        scene.removeItem(sel_rect);
        delete sel_rect;
        sel_rect=0;
    }
}

void CMImage::setImageMode(ImageMode imode,QAbstractButton * find_button)
{
    _findbutt=find_button;

    (a_sel_lt=popupSel.addAction(QIcon(":/new/icons/icons/sel_lt.png"),tr("&resize left top")))->setCheckable(true);
    (a_sel_lb=popupSel.addAction(QIcon(":/new/icons/icons/sel_lb.png"),tr("r&esize left bottom")))->setCheckable(true);
    (a_sel_rt=popupSel.addAction(QIcon(":/new/icons/icons/sel_rt.png"),tr("re&size right top")))->setCheckable(true);
    (a_sel_rb=popupSel.addAction(QIcon(":/new/icons/icons/sel_rb.png"),tr("resi&ze right bottom")))->setCheckable(true);
    (a_sel_norm=popupSel.addAction(QIcon(":/new/icons/icons/sel_new.png"),tr("&start new")))->setCheckable(true);
    agrpSel.addAction(a_sel_lt);
    agrpSel.addAction(a_sel_lb);
    agrpSel.addAction(a_sel_rt);
    agrpSel.addAction(a_sel_rb);
    agrpSel.addAction(a_sel_norm);

    (a_move=popup.addAction(tr("&move")))->setCheckable(true);
    a_move->setShortcut(QKeySequence("Ctrl+M"));
    (a_select=popup.addAction(tr("&select")))->setCheckable(true);
    a_select->setShortcut(QKeySequence("Ctrl+S"));
    agrp.addAction(a_move);
    agrp.addAction(a_select);
    a_select_all=popup.addAction(tr("select &all"));
    a_select_all->setShortcut(QKeySequence("Ctrl+V"));

    popup.addSeparator();
    a_navigate=popup.addAction(QIcon(":/new/icons/icons/navigate.png"),tr("navi&gate"));
    a_navigate->setShortcut(QKeySequence("Ctrl+G"));
    popup.addSeparator();
    popup.addMenu(&popupSel);
    a_clr_selection=popup.addAction(tr("c&lear selection"));
    a_clr_selection->setShortcut(QKeySequence("Ctrl+L"));
    popup.addSeparator();
    (a_copy=popup.addAction(tr("&copy image")))->setShortcut(QKeySequence("Ctrl+I"));

    if(imode==Pdf)
    {
        (a_copy_text=popup.addAction(tr("copy &text")))->setShortcut(QKeySequence("Ctrl+C"));
        (a_dictionary=popup.addAction(tr("c&opy text to dictionary")))->setShortcut(QKeySequence("Ctrl+D"));
        (a_conv=popup.addAction(tr("copy to &num converter")))->setShortcut(QKeySequence("Ctrl+N"));
    }
    else
        a_copy_text=a_dictionary=a_conv=0;

    popup.addSeparator();
    if(imode==Pdf)
    {
        a_find=popup.addAction(QIcon(":/new/icons/icons/loupe.png"),tr("search te&xt"));
        a_find->setShortcut(QKeySequence("Ctrl+F"));
        a_find->setCheckable(true);
    }
    else
        a_find=0;

    a_zoomplus=popup.addAction(QIcon(":/new/icons/icons/loupe_plus.png"),tr("zoom +"));
    a_zoomplus->setShortcut(QKeySequence(Qt::ControlModifier+Qt::Key_Plus));
    a_zoomminus=popup.addAction(QIcon(":/new/icons/icons/loupe_minus.png"),tr("zoom -"));
    a_zoomminus->setShortcut(QKeySequence(Qt::ControlModifier+Qt::Key_Minus));

    popup.addSeparator();

    a_repaint=popup.addAction(tr("repaint"));
    (a_sett=popup.addAction(QIcon(":/new/icons/icons/settings.png"),tr("setti&ngs")))->setCheckable(true);
    a_sett->setShortcut(QKeySequence("Ctrl+T"));

    if(imode==Pdf)
    {
        popup.addSeparator();
        a_links=popup.addAction(tr("links on pa&ge"));
        a_fonts=popup.addAction(tr("fonts"));
    }
    else
        a_links=a_fonts=0;

    _i_mode=imode;
}

/*void CMImage::rotate(qreal angle)
{
    cancelSelection();
    _rotate=angle;
    QGraphicsView::resetMatrix();
    QGraphicsView::scale(_scale,_scale);
    QGraphicsView::rotate(_rotate);
}*/

QSizeF CMImage::currentPageSize() const
{
    if(current)
        return current->boundingRect().size();
    else
        return QSizeF();
}

void CMImage::copyImage()
{
    if(sel_rect&&current)
    {
        QRectF const r(selection.intersected(current->boundingRect()));
        QImage cimage(r.width(),r.height(),QImage::Format_RGB16);
        QPainter p(&cimage);
        sel_rect->hide();
        scene.render(&p,QRectF(0,0,cimage.width(),cimage.height()),r);
        sel_rect->show();
        QApplication::clipboard()->setImage(cimage);
        m_msg()->MsgMsg(tr("image was copied into clipboard, pos: ")+QString::number(r.x())+","+QString::number(r.y())+tr(" size: ")+QString::number(r.width())+","+QString::number(r.height()));
    }
}

void CMImage::clearSelection()
{
    grid(false);
    if(sel_rect)
    {
        scene.removeItem(sel_rect);
        delete sel_rect;
        sel_rect=0;
    }
    selection=QRectF();
    _s_mode=Normal;
    emit selectionChanged(selection);
}
